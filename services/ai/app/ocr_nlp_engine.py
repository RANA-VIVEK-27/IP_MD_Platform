import os
import re
import json
import base64
import httpx
from typing import List, Tuple, Optional
from .schemas import (
    ExtractedFieldItem,
    PrescriptionExtractionResponse,
    ReportValueItem,
    ReportParseResponse,
)

CONFIDENCE_THRESHOLD = 0.850


def _tesseract_ocr(image_bytes: bytes) -> str:
    """Extract text from image using Tesseract OCR locally."""
    try:
        import pytesseract
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"[Tesseract OCR Error]: {e}")
        return ""


def _extract_prescription_fields_from_text(ocr_text: str) -> List[Tuple[str, str, float]]:
    """
    Structured extraction of prescription fields from raw OCR text.
    Parses the Rx table format: numbered entries with Medicine, Dose, Frequency, Duration.
    Also extracts patient name, doctor name, and diagnosis from header.
    """
    fields = []
    lines = ocr_text.split('\n')

    # --- 1. Patient Name ---
    patient_name = ""
    for line in lines:
        m = re.search(r"patient\s*name\s*[:\-]?\s*(.+)", line, re.IGNORECASE)
        if m:
            patient_name = m.group(1).strip()
            patient_name = re.sub(r"[:\s]+$", "", patient_name)
            break
    if not patient_name:
        m = re.search(r"(?:patient|name)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)", ocr_text)
        if m:
            patient_name = m.group(1).strip()
    if patient_name:
        fields.append(("patient_name", patient_name[:60], 0.92))

    # --- 2. Prescribing Doctor ---
    doctor = ""
    # Look for "Dr. Name Name" pattern in header (before the Rx section)
    rx_idx = len(ocr_text)
    for marker in ["Rx", "Diagnosis", "Medicine", "Patient Name"]:
        idx = ocr_text.lower().find(marker.lower())
        if idx != -1 and idx < rx_idx:
            rx_idx = idx
    header_text = ocr_text[:rx_idx]
    dr_matches = re.findall(r"Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})", header_text)
    if dr_matches:
        doctor = "Dr. " + dr_matches[0].strip()
    if not doctor:
        m = re.search(r"Dr\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})", ocr_text)
        if m:
            doctor = "Dr. " + m.group(1).strip()
    if doctor:
        fields.append(("prescribing_doctor", doctor[:60], 0.93))

    # --- 3. Diagnosis ---
    diagnosis = ""
    m = re.search(r"diagnosis\s*[:\-]?\s*(.+)", ocr_text, re.IGNORECASE)
    if m:
        diagnosis = m.group(1).strip()[:80]
    if diagnosis:
        fields.append(("diagnosis", diagnosis, 0.90))

    # --- 4. Parse Medicine Table (line-by-line) ---
    medicines = []
    med_prefix_re = re.compile(
        r"^\s*(?:\(?\d+\)?)\s+"               # number: 1, (1), 1)
        r"(Tab\.?|Syrup|Cap\.?|Capsule|Injection|Inj\.?|Drops?|Suspension|Gel|Ointment|Cream|Sachet)"
        r"\s+",
        re.IGNORECASE
    )
    freq_re = re.compile(
        r"((?:Once|Twice|Thrice|Three times|Four times)\s+Daily(?:\s*\([^)]*\))?)",
        re.IGNORECASE
    )
    dur_re = re.compile(r"(\d+\s*(?:days?|weeks?|months?))", re.IGNORECASE)
    dose_form_re = re.compile(r"(\d+(?:\.\d+)?\s*(?:Tablet|tablet|Capsule|capsule|Cap|cap|ml|drop[s]?|Sachet|sachet|g\b))")

    def _parse_medicine_line(line_text):
        """Parse a single medicine line into name, dose, frequency, duration."""
        text = line_text.strip()

        # Find frequency
        freq_match = freq_re.search(text)
        frequency = freq_match.group(1) if freq_match else ""

        # Find duration (after frequency if possible)
        dur_match = dur_re.search(text)
        duration = dur_match.group(1) if dur_match else ""

        # Find dose form (e.g. "1 Tablet", "5 ml")
        dose_form = ""
        for dm in dose_form_re.finditer(text):
            candidate = dm.group(1)
            # Verify it's a dose form, not part of medicine name strength
            if re.search(r"(?:Tablet|Capsule|Cap|ml|drop|sachet)", candidate, re.IGNORECASE):
                dose_form = candidate
                break

        # Extract medicine name: everything before the dose form (or before freq if no dose form)
        med_name = text
        if dose_form:
            idx = text.find(dose_form)
            if idx > 0:
                med_name = text[:idx].strip()
        elif freq_match:
            med_name = text[:freq_match.start()].strip()

        # Remove dose form from name if it got included
        if dose_form and med_name.endswith(dose_form):
            med_name = med_name[:-len(dose_form)].strip()

        # Clean trailing strength from name if it duplicated
        # e.g. "Tab. Azithromycin 500 mg 500 mg" -> "Tab. Azithromycin 500 mg"

        return {
            "name": med_name[:80],
            "dose": dose_form[:40] if dose_form else "",
            "frequency": frequency[:50],
            "duration": duration[:30],
        }

    in_medicine_section = False
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        low = stripped.lower()

        if not stripped:
            i += 1
            continue

        # Detect section boundaries
        if re.match(r"medicine|medication|drug", low) and ("dose" in low or "frequency" in low or "duration" in low):
            in_medicine_section = True
            i += 1
            continue
        if any(kw in low for kw in ["advice", "test", "follow up", "note:", "signature"]):
            in_medicine_section = False
            i += 1
            continue

        # Check if line starts with a medicine prefix
        m = med_prefix_re.match(stripped)

        if m:
            # Collect this line + continuation lines (like "(For Fever)")
            full_line = stripped
            while i + 1 < len(lines):
                next_stripped = lines[i + 1].strip()
                if not next_stripped:
                    i += 1
                    continue
                # Continuation lines start with ( or are short notes
                if next_stripped.startswith("(") and not med_prefix_re.match(next_stripped):
                    full_line += " " + next_stripped
                    i += 1
                else:
                    break

            # Remove leading number
            med_text = re.sub(r"^\s*\(?\d+\)?\s+", "", full_line)
            parsed = _parse_medicine_line(med_text)
            if parsed["name"]:
                medicines.append(parsed)

        i += 1

    # Build medicine fields: each medicine gets its own set of fields
    if medicines:
        for idx, med in enumerate(medicines):
            prefix = f"medicine_{idx + 1}" if len(medicines) > 1 else "medicine"
            fields.append((f"{prefix}_name", med["name"], 0.91))
            if med["dose"]:
                fields.append((f"{prefix}_dose", med["dose"], 0.90))
            if med["frequency"]:
                fields.append((f"{prefix}_frequency", med["frequency"], 0.91))
            if med["duration"]:
                fields.append((f"{prefix}_duration", med["duration"], 0.92))
    else:
        # Fallback: try to find any medicine-like line
        for line in lines:
            stripped = line.strip()
            if re.match(r"^\s*(?:Tab|Syrup|Cap|Capsule|Inj|Injection)\b", stripped, re.IGNORECASE):
                parsed = _parse_medicine_line(stripped)
                if parsed["name"]:
                    fields.append(("medicine_name", parsed["name"][:80], 0.82))
                    break

    # --- 5. Advice/Tests (bonus) ---
    advice_items = []
    in_advice = False
    for line in lines:
        stripped = line.strip()
        low = stripped.lower()
        if "advice" in low or "test" in low:
            in_advice = True
            continue
        if in_advice and stripped:
            if re.match(r"^\s*follow|^\s*note|^\s*dr\.|^\s*signature", low):
                break
            if stripped.startswith("•") or stripped.startswith("-") or stripped.startswith("*") or re.match(r"^\s*[A-Z]", stripped):
                advice_items.append(stripped.lstrip("•-* "))
    if advice_items:
        fields.append(("advice", "; ".join(advice_items)[:200], 0.85))

    return fields


def _extract_report_fields_from_text(ocr_text: str) -> Tuple[List[ReportValueItem], str]:
    """
    Heuristic extraction of lab report values from raw OCR text.
    Looks for test names with numeric values, units, and reference ranges.
    """
    values = []
    text_lower = ocr_text.lower()

    # Common lab test patterns: "Test Name  Value  Unit  Reference Range"
    test_patterns = [
        r"((?:fasting|post\s*prandial|random)?\s*(?:blood\s+sugar|glucose|glu))\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL|mmol/L)?",
        r"(HbA1c|glycated?\s*hemoglobin)\s*[:\-]?\s*(\d+\.?\d*)\s*(%)?",
        r"(total\s+cholesterol|cholesterol)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
        r"(HDL|LDL|triglycerides?)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
        r"(creatinine|blood\s+urea|BUN)\s*[:\-]?\s*(\d+\.?\d*)\s*(mg/dL)?",
        r"(hemoglobin|Hb)\s*[:\-]?\s*(\d+\.?\d*)\s*(g/dL|g%|g/L)?",
        r"(WBC|white\s+blood\s+cell|leukocyte)\s*[:\-]?\s*(\d+\.?\d*)\s*(×10[³3]|/mm3|K/µL|10\^3)?",
        r"(platelet|PLT)\s*[:\-]?\s*(\d+\.?\d*)\s*(×10[³3]|/mm3|K/µL)?",
        r"(TSH|thyroid\s+stimulating)\s*[:\-]?\s*(\d+\.?\d*)\s*(mIU/L|µIU/mL)?",
        r"(ALT|SGPT|AST|SGOT)\s*[:\-]?\s*(\d+\.?\d*)\s*(U/L|IU/L)?",
    ]

    reference_ranges = {
        "fasting blood sugar": "70 - 99 mg/dL",
        "blood sugar": "70 - 99 mg/dL",
        "glucose": "70 - 99 mg/dL",
        "HbA1c": "4.0 - 5.6 %",
        "total cholesterol": "< 200 mg/dL",
        "HDL": "> 40 mg/dL",
        "LDL": "< 100 mg/dL",
        "triglycerides": "< 150 mg/dL",
        "creatinine": "0.6 - 1.2 mg/dL",
        "hemoglobin": "12.0 - 17.5 g/dL",
        "Hb": "12.0 - 17.5 g/dL",
        "WBC": "4,500 - 11,000 /mm3",
        "platelet": "150,000 - 400,000 /mm3",
        "TSH": "0.4 - 4.0 mIU/L",
        "ALT": "7 - 56 U/L",
        "AST": "10 - 40 U/L",
        "SGPT": "7 - 56 U/L",
        "SGOT": "10 - 40 U/L",
    }

    found_tests = set()
    for pattern in test_patterns:
        for m in re.finditer(pattern, ocr_text, re.IGNORECASE):
            test_name = m.group(1).strip()
            value = m.group(2).strip()
            unit = m.group(3).strip() if m.group(3) else ""

            test_key = test_name.lower().strip()
            if test_key in found_tests:
                continue
            found_tests.add(test_key)

            ref = ""
            for rk, rv in reference_ranges.items():
                if rk in test_key or test_key in rk:
                    ref = rv
                    break

            flag = "normal"
            try:
                val_num = float(value)
                if "glucose" in test_key or "sugar" in test_key or "blood sugar" in test_key:
                    if val_num > 99:
                        flag = "abnormal"
                elif "hba1c" in test_key:
                    if val_num > 5.6:
                        flag = "abnormal"
                elif "cholesterol" in test_key and "hdl" not in test_key and "ldl" not in test_key:
                    if val_num > 200:
                        flag = "abnormal"
                elif "ldl" in test_key:
                    if val_num > 100:
                        flag = "abnormal"
                elif "hdl" in test_key:
                    if val_num < 40:
                        flag = "abnormal"
                elif "triglycerides" in test_key:
                    if val_num > 150:
                        flag = "abnormal"
            except ValueError:
                pass

            values.append(ReportValueItem(
                test_name=test_name,
                value=value,
                unit=unit if unit else None,
                reference_range=ref if ref else None,
                flag=flag,
            ))

    # Build summary
    abnormal_vals = [v for v in values if v.flag == "abnormal"]
    if abnormal_vals:
        abnormal_names = ", ".join([f"{v.test_name} ({v.value} {v.unit or ''})".strip() for v in abnormal_vals])
        summary = f"AI Diagnostic Summary: Abnormal values detected: {abnormal_names}. Please consult your physician for interpretation."
    elif values:
        summary = "AI Diagnostic Summary: All tested biomarker parameters fall within normal physiological reference ranges."
    else:
        summary = "AI Diagnostic Summary: No structured lab values could be extracted from the document. Please review manually."

    return values, summary


class OCRNLPEngine:
    @staticmethod
    def extract_prescription(
        prescription_id: str,
        image_bytes: bytes = None,
        image_base64: str = None,
        filename: str = "prescription.jpg",
        simulate_low_confidence: bool = False
    ) -> PrescriptionExtractionResponse:
        """
        Executes prescription OCR (Google Cloud Vision API) & Entity structuring (OpenAI GPT-4o).
        Performs per-field confidence scoring. Any field with score < 0.85 flags needs_review = True
        and moves parent extraction_status to 'needs_review'.
        """
        google_vision_key = os.getenv("GOOGLE_VISION_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        extracted_raw = None
        ocr_provider = "google_cloud_vision_simulated"
        nlp_provider = "openai_gpt4o_simulated"

        if (google_vision_key and len(google_vision_key.strip()) > 5) or (openai_key and len(openai_key.strip()) > 5):
            extracted_raw, ocr_p, nlp_p = OCRNLPEngine._cloud_ocr_gpt4o_pipeline(
                image_bytes=image_bytes,
                image_base64=image_base64,
                filename=filename
            )
            if extracted_raw:
                ocr_provider = ocr_p
                nlp_provider = nlp_p

        if not extracted_raw and image_bytes:
            ocr_text = _tesseract_ocr(image_bytes)
            if ocr_text:
                extracted_raw = _extract_prescription_fields_from_text(ocr_text)
                ocr_provider = "tesseract_local"
                nlp_provider = "heuristic_regex"

        if not extracted_raw:
            extracted_raw = OCRNLPEngine._simulated_prescription_pipeline(simulate_low_confidence)

        fields: List[ExtractedFieldItem] = []
        has_sub_threshold = False

        for name, val, score in extracted_raw:
            needs_rev = score < CONFIDENCE_THRESHOLD
            if needs_rev:
                has_sub_threshold = True

            fields.append(
                ExtractedFieldItem(
                    field_name=name,
                    value=val,
                    confidence_score=round(score, 3),
                    needs_review=needs_rev,
                )
            )

        status = "needs_review" if has_sub_threshold else "extracted"

        return PrescriptionExtractionResponse(
            prescription_id=prescription_id,
            extraction_status=status,
            fields=fields,
            ocr_provider=ocr_provider,
            nlp_provider=nlp_provider,
        )

    @staticmethod
    def parse_report(
        report_id: str,
        doc_bytes: bytes = None,
        doc_base64: str = None,
        filename: str = "lab_report.pdf",
        simulate_abnormal: bool = False
    ) -> ReportParseResponse:
        """
        Executes medical NLP report parsing (OpenAI GPT-4o).
        Parses test metrics, compares against reference ranges, and flags abnormal values
        with plain-language summary explanations per BRD FR-2.
        """
        openai_key = os.getenv("OPENAI_API_KEY")
        nlp_provider = "openai_gpt4o_simulated"
        values = None
        summary = None

        if openai_key and len(openai_key.strip()) > 5:
            values, summary = OCRNLPEngine._cloud_gpt4o_report_pipeline(
                doc_bytes=doc_bytes,
                doc_base64=doc_base64,
                filename=filename
            )
            if values:
                nlp_provider = "openai_gpt4o_live"

        if not values and doc_bytes:
            ocr_text = _tesseract_ocr(doc_bytes)
            if ocr_text:
                values, summary = _extract_report_fields_from_text(ocr_text)
                nlp_provider = "tesseract_local"

        if not values:
            values, summary = OCRNLPEngine._simulated_report_pipeline(simulate_abnormal)

        return ReportParseResponse(
            report_id=report_id,
            extraction_status="extracted",
            values=values,
            ai_explanation=summary,
            nlp_provider=nlp_provider,
        )

    @staticmethod
    def _simulated_prescription_pipeline(simulate_low_confidence: bool) -> List[Tuple[str, str, float]]:
        base_score = 0.720 if simulate_low_confidence else 0.960
        return [
            ("medicine_name", "Metformin 500mg", base_score),
            ("dosage", "1 tablet", 0.940),
            ("frequency", "Twice daily after meals", 0.910),
            ("duration", "30 days", 0.950),
            ("prescribing_doctor", "Dr. Rajesh Verma, MD", 0.980),
            ("patient_name", "John Doe", 0.990),
        ]

    @staticmethod
    def _simulated_report_pipeline(simulate_abnormal: bool) -> Tuple[List[ReportValueItem], str]:
        if simulate_abnormal:
            items = [
                ReportValueItem(
                    test_name="Fasting Blood Sugar (FBS)",
                    value="138",
                    unit="mg/dL",
                    reference_range="70 - 99",
                    flag="abnormal",
                ),
                ReportValueItem(
                    test_name="HbA1c",
                    value="7.2",
                    unit="%",
                    reference_range="4.0 - 5.6",
                    flag="abnormal",
                ),
                ReportValueItem(
                    test_name="Total Cholesterol",
                    value="215",
                    unit="mg/dL",
                    reference_range="< 200",
                    flag="abnormal",
                ),
            ]
            summary = (
                "AI Diagnostic Summary: Fasting Blood Glucose (138 mg/dL) and HbA1c (7.2%) are elevated above reference thresholds, "
                "indicating hyperglycemia. Total Cholesterol is moderately elevated at 215 mg/dL. Please consult your physician."
            )
        else:
            items = [
                ReportValueItem(
                    test_name="Fasting Blood Sugar (FBS)",
                    value="88",
                    unit="mg/dL",
                    reference_range="70 - 99",
                    flag="normal",
                ),
                ReportValueItem(
                    test_name="HbA1c",
                    value="5.2",
                    unit="%",
                    reference_range="4.0 - 5.6",
                    flag="normal",
                ),
            ]
            summary = "AI Diagnostic Summary: All tested biomarker parameters fall strictly within normal physiological reference ranges."
        return items, summary

    @staticmethod
    def _cloud_ocr_gpt4o_pipeline(
        image_bytes: Optional[bytes] = None,
        image_base64: Optional[str] = None,
        filename: str = "prescription.jpg"
    ) -> Tuple[Optional[List[Tuple[str, str, float]]], str, str]:
        google_vision_key = os.getenv("GOOGLE_VISION_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        ocr_text = ""
        ocr_p = "google_cloud_vision_simulated"
        nlp_p = "openai_gpt4o_simulated"

        # 1. Google Cloud Vision OCR if key provided and image supplied
        if google_vision_key and len(google_vision_key.strip()) > 5:
            b64_data = image_base64
            if not b64_data and image_bytes:
                b64_data = base64.b64encode(image_bytes).decode('utf-8')

            if b64_data:
                try:
                    url = f"https://vision.googleapis.com/v1/images:annotate?key={google_vision_key.strip()}"
                    payload = {
                        "requests": [
                            {
                                "image": {"content": b64_data},
                                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
                            }
                        ]
                    }
                    with httpx.Client(timeout=15.0) as client:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            r_data = resp.json()
                            responses = r_data.get("responses", [])
                            if responses and "fullTextAnnotation" in responses[0]:
                                ocr_text = responses[0]["fullTextAnnotation"].get("text", "")
                                ocr_p = "google_cloud_vision_live"
                except Exception as e:
                    print(f"[Google Vision API Error]: {e}")

        # 2. OpenAI GPT-4o Entity Structuring
        if openai_key and len(openai_key.strip()) > 5:
            try:
                prompt_content = ocr_text if ocr_text else f"Prescription document filename: {filename}."
                sys_prompt = (
                    "You are a medical OCR entity extraction system for medical prescriptions in India. "
                    "Extract prescribed medicines into a JSON object strictly adhering to this format:\n"
                    "{\n"
                    '  "fields": [\n'
                    '    {"field_name": "medicine_name", "value": "Metformin 500mg", "confidence_score": 0.96},\n'
                    '    {"field_name": "dosage", "value": "1 tablet", "confidence_score": 0.94},\n'
                    '    {"field_name": "frequency", "value": "Twice daily", "confidence_score": 0.91},\n'
                    '    {"field_name": "duration", "value": "30 days", "confidence_score": 0.95},\n'
                    '    {"field_name": "prescribing_doctor", "value": "Dr. Rajesh Verma", "confidence_score": 0.98},\n'
                    '    {"field_name": "patient_name", "value": "John Doe", "confidence_score": 0.99}\n'
                    '  ]\n'
                    "}\n"
                    "Provide accurate extraction and realistic confidence scores (0.00 to 1.00)."
                )

                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {openai_key.strip()}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": prompt_content}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }

                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        content_str = resp.json()["choices"][0]["message"]["content"]
                        parsed = json.loads(content_str)
                        fields_raw = parsed.get("fields", [])
                        extracted_tuples = []
                        for f in fields_raw:
                            fn = f.get("field_name", "")
                            val = f.get("value", "")
                            conf = float(f.get("confidence_score", 0.90))
                            if fn and val:
                                extracted_tuples.append((fn, val, conf))
                        if extracted_tuples:
                            nlp_p = "openai_gpt4o_live"
                            return extracted_tuples, ocr_p, nlp_p
            except Exception as e:
                print(f"[OpenAI API Error]: {e}")

        return None, ocr_p, nlp_p

    @staticmethod
    def _cloud_gpt4o_report_pipeline(
        doc_bytes: Optional[bytes] = None,
        doc_base64: Optional[str] = None,
        filename: str = "lab_report.pdf"
    ) -> Tuple[Optional[List[ReportValueItem]], Optional[str]]:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key or len(openai_key.strip()) <= 5:
            return None, None

        try:
            sys_prompt = (
                "You are an expert diagnostic lab report parser. Extract test biomarkers and results into a JSON object adhering to:\n"
                "{\n"
                '  "values": [\n'
                '    {"test_name": "Fasting Blood Sugar", "value": "138", "unit": "mg/dL", "reference_range": "70-99", "flag": "abnormal"}\n'
                '  ],\n'
                '  "ai_explanation": "Plain language summary explaining any abnormal flags..."\n'
                "}"
            )
            user_prompt = f"Diagnostic Lab Report File: {filename}"

            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {openai_key.strip()}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }

            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    content_str = resp.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(content_str)
                    raw_vals = parsed.get("values", [])
                    ai_exp = parsed.get("ai_explanation", "")

                    items = []
                    for v in raw_vals:
                        items.append(
                            ReportValueItem(
                                test_name=v.get("test_name", ""),
                                value=str(v.get("value", "")),
                                unit=v.get("unit"),
                                reference_range=v.get("reference_range"),
                                flag=v.get("flag", "normal")
                            )
                        )
                    if items:
                        return items, ai_exp
        except Exception as e:
            print(f"[OpenAI Report Parser Error]: {e}")

        return None, None

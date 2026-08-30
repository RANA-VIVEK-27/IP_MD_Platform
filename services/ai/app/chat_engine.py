import os
import math
import json
import httpx
from typing import List, Optional, Tuple, Dict, Any
import re
from .schemas import (
    ChatCompletionResponse,
    StructuredPrescriptionFactBundle,
    ClaimClassification,
    TestStatus,
)
from .analysis_engine import DocumentAnalysisEngine

try:
    from google import genai
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False


class ClaimValidatorEngine:
    """
    Fail-closed claim validation engine.
    Validates generated response at the claim level against extracted facts and user prompt.
    """

    UNSUPPORTED_PATTERNS = [
        r"\bactive recovery\b",
        r"\bclinically stable\b",
        r"\bcondition is improving\b",
        r"\bno signs of infection\b",
        r"\btreatment is working\b",
        r"\brecovering well\b",
        r"\byour stomach lining is (?:currently )?inflamed\b",
        r"\byou are experiencing\b",
        r"\bbody temperature exceeds 102°F\b",
        r"\bbreathlessness occurs\b",
        r"\bhas an? infection\b",
        r"\btest is (?:positive|negative|detected)\b",
        r"\babnormal (?:cbc|lft)\b",
        r"\bnormal (?:cbc|lft)\b",
        r"\banemia\b",
    ]

    @classmethod
    def validate_and_classify_claims(
        cls,
        response_text: str,
        structured_facts: Optional[StructuredPrescriptionFactBundle] = None,
        user_query: str = ""
    ) -> Tuple[bool, List[Dict[str, Any]], int]:
        """
        Splits response into claims and verifies each claim.
        Returns: (passed_all, claim_details, rejected_count)
        """
        if not response_text:
            return False, [], 1

        claims = [c.strip() for c in re.split(r"(?<!\d)\.(?!\d)|\n", response_text) if c.strip() and len(c.strip()) > 5]
        claim_details = []
        rejected_count = 0
        passed_all = True

        for claim in claims:
            low_claim = claim.lower()
            classification = ClaimClassification.GENERAL_MEDICAL_EDUCATION
            is_rejected = False

            # Check 1: Explicit Unsupported Patterns
            for pat in cls.UNSUPPORTED_PATTERNS:
                if re.search(pat, low_claim):
                    classification = ClaimClassification.UNSUPPORTED_PATIENT_CLAIM
                    is_rejected = True
                    break

            # Check 2: Dynamic Claim Classification & Patient Assertion Validation
            if not is_rejected:
                has_patient_prefix = bool(re.search(r"\b(?:your|you have|patient has|patient is|you are)\b", low_claim))

                if any(kw in low_claim for kw in ["reference range", "below", "above", "out of range", "within reference", "flagged"]):
                    classification = ClaimClassification.DOCUMENT_GROUNDED_INTERPRETATION
                elif any(kw in low_claim for kw in ["general medical information", "refer to", "commonly associated", "generally", "measures", "protein in red blood"]):
                    classification = ClaimClassification.GENERAL_MEDICAL_EDUCATION
                elif structured_facts and (
                    any(d.lower() in low_claim for d in structured_facts.diagnosis if d) or
                    any(m.name.lower() in low_claim for m in structured_facts.medicines if m.name) or
                    any(t.test_name.lower() in low_claim for t in structured_facts.tests_advised if t.test_name) or
                    any(tr.parameter.lower() in low_claim for tr in structured_facts.test_results if tr.parameter)
                ):
                    classification = ClaimClassification.SUPPORTED_DOCUMENT_FACT
                elif has_patient_prefix:
                    classification = ClaimClassification.UNSUPPORTED_PATIENT_CLAIM

                if has_patient_prefix:
                    supported = False
                    if classification in (ClaimClassification.SUPPORTED_DOCUMENT_FACT, ClaimClassification.DOCUMENT_GROUNDED_INTERPRETATION):
                        supported = True
                    elif "disclaimer" in low_claim or "consult" in low_claim or "discussed" in low_claim:
                        supported = True

                    if not supported:
                        classification = ClaimClassification.UNSUPPORTED_PATIENT_CLAIM
                        is_rejected = True

            if is_rejected:
                rejected_count += 1
                passed_all = False

            claim_details.append({
                "claim": claim,
                "classification": classification,
                "is_rejected": is_rejected
            })

        return passed_all, claim_details, rejected_count


def generate_lab_report_response(
    structured_facts: Optional[StructuredPrescriptionFactBundle], message_text: str
) -> str:
    """
    Authoritative Lab Report Formatter powered by DocumentAnalysisEngine.
    Provides 5 levels of medical document analysis: Facts, Meaning, Important Findings, Suggestions, Safety.
    """
    lines = [
        "⚠️ **MEDICAL DISCLAIMER**: I am an AI Health Assistant. This explanation is for informational and educational purposes and is not a medical diagnosis.\n"
    ]
    lines.append("🧪 **What Your Report Shows**:\n")

    if not structured_facts or not structured_facts.test_results:
        lines.append("I can see your selected lab report record, but no extracted numeric lab parameters were found in the database for this specific document.\n")
        lines.append("• **Recommendation**: Please ensure your lab report image/PDF is clearly legible and complete, or re-upload a clearer copy.")
        lines.append("\n❓ **What Is Missing**:")
        lines.append("- Specific numeric lab values (e.g. Hemoglobin, Glucose, Cholesterol) are not present in this extracted record.")
        return "\n".join(lines)

    analysis = DocumentAnalysisEngine.analyze_document(structured_facts)

    # Level 1: Facts Table
    lines.append("📊 **Documented Report Results**:")
    for tr in structured_facts.test_results:
        unit_str = f" {tr.unit}" if tr.unit else ""
        ref_str = f" (Reference Range: {tr.reference_range})" if tr.reference_range and tr.reference_range != "Not specified" else ""
        flag_str = f" — [{tr.flag.upper()}]" if tr.flag and tr.flag != "normal" else ""
        lines.append(f"- **{tr.parameter}**: {tr.value}{unit_str}{ref_str}{flag_str}")

    # Level 3: Important Findings / Out-of-Range Parameters & Patterns
    lines.append("\n🔎 **Important Findings**:")
    if analysis["abnormalities"]:
        for ab in analysis["abnormalities"]:
            u_str = f" {ab['unit']}" if ab['unit'] else ""
            lines.append(f"- **{ab['parameter']}**: {ab['value']}{u_str} is flagged as **{ab['flag'].upper()}** relative to the laboratory reference range ({ab['reference_range']}).")
    else:
        lines.append("- All documented numeric lab values are within their provided laboratory reference ranges.")

    if analysis["patterns"]:
        for p in analysis["patterns"]:
            lines.append(f"- **Clinical Relationship**: {p}")

    # Level 2: Meaning / Document-Grounded Interpretations & General Medical Education
    lines.append("\n📖 **What These Findings Mean (General Medical Education)**:")
    for tr in structured_facts.test_results:
        p_low = tr.parameter.lower()
        if "hemoglobin" in p_low or "hb" in p_low:
            lines.append("• **Hemoglobin**: A protein in red blood cells that carries oxygen from the lungs to body tissues. Values below or above reference ranges should be evaluated alongside overall red blood cell indices.")
        elif "glucose" in p_low or "sugar" in p_low or "hba1c" in p_low:
            lines.append("• **Blood Glucose / HbA1c**: Measures circulating blood sugar levels. Reference ranges help evaluate glycemic regulation and metabolic function.")
        elif "cholesterol" in p_low or "hdl" in p_low or "ldl" in p_low:
            lines.append("• **Lipid Metrics**: Measures circulating fats and cholesterol fractions related to cardiovascular vascular health.")
        else:
            lines.append(f"• **{tr.parameter}**: Documented laboratory parameter evaluated against the testing facility's reference standards.")

    # Level 4: Relevant Suggestions & Next Steps
    lines.append("\n💡 **What You Can Consider Doing**:")
    for sug in analysis["suggestions"]:
        lines.append(f"- {sug}")

    # Level 5: Missing Information & Safety
    lines.append("\n❓ **What Is Missing**:")
    for mi in analysis["missing_info"]:
        lines.append(f"- {mi}")

    return "\n".join(lines)


def generate_prescription_response(
    structured_facts: Optional[StructuredPrescriptionFactBundle], message_text: str
) -> str:
    lines = ["⚠️ **MEDICAL DISCLAIMER**: I am an AI Health Assistant and not a licensed medical professional. My responses are for informational and educational purposes only.\n"]
    lines.append("💊 **What Your Prescription Contains**:\n")

    if not structured_facts or (
        not structured_facts.diagnosis
        and not structured_facts.medicines
        and not structured_facts.tests_advised
    ):
        lines.append("This information is not provided in the uploaded medical record.\n")
        lines.append("• **Follow-up / Assistance**: Please upload your prescription or consult your Family Doctor for specific medical evaluation.")
        return "\n".join(lines)

    analysis = DocumentAnalysisEngine.analyze_document(structured_facts)

    lines.append("📋 **Diagnosis**:")
    if structured_facts.diagnosis:
        for d in structured_facts.diagnosis:
            lines.append(f"- {d}")
    else:
        lines.append("- Not clearly mentioned in the uploaded document.")

    lines.append("\n💊 **Prescribed Medicines**:")
    if structured_facts.medicines:
        for m in structured_facts.medicines:
            lines.append(f"- **{m.name}** | Dose: {m.dose} | Frequency: {m.frequency} | Duration: {m.duration} | Instructions: {m.instructions}")
    else:
        lines.append("- Not clearly mentioned in the uploaded document.")

    lines.append("\n🧪 **Tests Advised**:")
    if structured_facts.tests_advised:
        for t in structured_facts.tests_advised:
            lines.append(f"- **{t.test_name}** (Status: Advised / Ordered by Doctor)")
        lines.append("  *Note: These tests were advised/ordered by your doctor. No test results are present in this prescription.*")
    else:
        lines.append("- Not clearly mentioned in the uploaded document.")

    lines.append("\n🍽️ **Doctor's Instructions & Dietary Advice**:")
    if structured_facts.general_advice:
        for a in structured_facts.general_advice:
            lines.append(f"- {a}")
    else:
        lines.append("- Not clearly mentioned in the uploaded document.")

    lines.append(f"\n📅 **Follow-up**: {structured_facts.follow_up}")

    lines.append("\n📖 **What the Treatment Is Generally Intended For**:")
    if structured_facts.diagnosis:
        for d in structured_facts.diagnosis:
            if "gastritis" in d.lower():
                lines.append("• **Acute Gastritis Treatment**: Medications commonly manage stomach acidity, protect the mucosal lining, and relieve gastrointestinal discomfort.")
            else:
                lines.append(f"• **{d}**: The treatment plan targets management of this documented clinical diagnosis as directed by your physician.")
    else:
        lines.append("• Consult your prescribing doctor for specific educational details regarding your prescription.")

    lines.append("\n💡 **Practical Points & Next Steps**:")
    for sug in analysis["suggestions"]:
        lines.append(f"- {sug}")

    lines.append("\n❓ **What Is Not Known**:")
    for mi in analysis["missing_info"]:
        lines.append(f"- {mi}")

    return "\n".join(lines)


def generate_deterministic_safe_fallback(
    structured_facts: Optional[StructuredPrescriptionFactBundle], message_text: str, doc_type: str = "all"
) -> str:
    dt = (doc_type if doc_type and doc_type != "all" else (structured_facts.document_type if structured_facts else "all")).lower()
    if dt in ("lab_report", "lab_results", "lab") or (structured_facts and len(structured_facts.test_results) > 0 and len(structured_facts.medicines) == 0):
        return generate_lab_report_response(structured_facts, message_text)
    elif dt in ("prescription", "rx"):
        return generate_prescription_response(structured_facts, message_text)
    else:
        if structured_facts and structured_facts.test_results and len(structured_facts.medicines) == 0:
            return generate_lab_report_response(structured_facts, message_text)
        return generate_prescription_response(structured_facts, message_text)


NON_DIAGNOSTIC_DISCLAIMER = (
    "⚠️ MEDICAL DISCLAIMER: I am an AI Health Assistant and not a licensed medical professional. "
    "My responses are for informational and educational purposes only, and do not constitute formal medical diagnosis, "
    "treatment, or clinical advice. Please consult a qualified healthcare provider for personal medical concerns."
)

EMERGENCY_KEYWORDS = [
    "chest pain", "shortness of breath", "difficulty breathing", "severe bleeding",
    "unconscious", "stroke", "heart attack", "anaphylaxis", "sudden paralysis",
    "coughing blood", "poisoning", "overdose", "suicidal", "suicide", "end my life"
]

CRITICAL_ADVANCED_KEYWORDS = [
    "high risk", "critical", "severe pain", "organ failure", "kidney failure", 
    "liver cirrhosis", "cardiac arrest", "malignant", "tumor", "chemotherapy",
    "uncontrolled fever", "blood pressure 180", "blood pressure 200", "loss of consciousness",
    "seizure", "convulsions", "severe allergic reaction", "anaphylactic", "internal bleeding",
]

FAMILY_DOCTOR_ESCALATION_RESPONSE = (
    "🚨 **HIGH-RISK / CLINICAL EMERGENCY ALERT** 🚨\n\n"
    "Your query indicates potential high-risk or critical health symptoms that require immediate clinical evaluation. "
    "AI Health Assistant cannot provide emergency treatment or manage critical instability.\n\n"
    "• **Immediate Action**: Please contact your **Family Doctor** or visit the nearest **Hospital Emergency Room** immediately.\n"
    "• **Emergency Contacts**: In India, dial **108** or **112** for emergency medical assistance.\n"
    "• Do not delay in-person medical consultation."
)


class GeminiChatEngine:
    @staticmethod
    def process_chat_message(
        session_id: str,
        message_text: str,
        document_type: Optional[str] = None,
        is_first_message: bool = False,
        rag_context: List[str] = [],
        pharmacy_price_context: List[str] = [],
        structured_facts: Optional[StructuredPrescriptionFactBundle] = None
    ) -> ChatCompletionResponse:

        lowered = message_text.lower()
        if any(kw in lowered for kw in EMERGENCY_KEYWORDS):
            return ChatCompletionResponse(
                session_id=session_id,
                reply_text=f"{NON_DIAGNOSTIC_DISCLAIMER}\n\n{FAMILY_DOCTOR_ESCALATION_RESPONSE}",
                is_ai_generated=True,
                guardrail_triggered=True,
                llm_provider="google_genai_gemini_2.5_flash_guardrail",
            )

        if any(kw in lowered for kw in CRITICAL_ADVANCED_KEYWORDS):
            return ChatCompletionResponse(
                session_id=session_id,
                reply_text=f"{NON_DIAGNOSTIC_DISCLAIMER}\n\n{FAMILY_DOCTOR_ESCALATION_RESPONSE}",
                is_ai_generated=True,
                guardrail_triggered=True,
                llm_provider="google_genai_gemini_2.5_flash_guardrail",
            )

        gemini_key = os.getenv("GEMINI_API_KEY")
        doc_scope_str = f"\n[Active Document Type Scope: {document_type.upper()}]" if document_type else ""

        context_str = ""
        if rag_context:
            context_str += "\n\nGeneral Medical Education RAG Context (For Education Only):\n" + "\n".join(f"- {c}" for c in rag_context)

        if pharmacy_price_context:
            context_str += "\n\nPharmacy Best Price Data:\n" + "\n".join(f"- {p}" for p in pharmacy_price_context)

        dt = (document_type or (structured_facts.document_type if structured_facts else "")).lower()
        is_lab = dt in ("lab_report", "lab_results", "lab") or (structured_facts and len(structured_facts.test_results) > 0 and len(structured_facts.medicines) == 0)

        fact_str = ""
        if structured_facts:
            fact_str += f"\n\nVALIDATED STRUCTURED DOCUMENT FACTS (Authoritative Document Type: {dt.upper()}):\n"
            if is_lab or (structured_facts.test_results and len(structured_facts.medicines) == 0):
                fact_str += "- Document Type: LAB REPORT\n"
                if structured_facts.test_results:
                    fact_str += "- DOCUMENTED LAB TEST RESULTS:\n"
                    for tr in structured_facts.test_results:
                        fact_str += f"  * {tr.parameter}: {tr.value} {tr.unit} (Ref: {tr.reference_range}, Flag: {tr.flag})\n"
                else:
                    fact_str += "- No numeric lab test values were extracted for this document.\n"
            else:
                fact_str += (
                    f"- Patient: {structured_facts.patient_name} ({structured_facts.patient_age}, {structured_facts.patient_gender})\n"
                    f"- Doctor: {structured_facts.doctor_name} ({structured_facts.doctor_qualification}, Reg: {structured_facts.doctor_reg_no})\n"
                    f"- Date: {structured_facts.date}\n"
                    f"- Diagnosis: {', '.join(structured_facts.diagnosis) if structured_facts.diagnosis else 'Not clearly mentioned'}\n"
                    f"- Medicines: {', '.join([f'{m.name} ({m.dose}, {m.frequency}, {m.duration})' for m in structured_facts.medicines]) if structured_facts.medicines else 'Not clearly mentioned'}\n"
                    f"- Tests Advised (ORDERED ONLY, NO RESULTS): {', '.join([t.test_name for t in structured_facts.tests_advised]) if structured_facts.tests_advised else 'Not clearly mentioned'}\n"
                    f"- Advice: {'; '.join(structured_facts.general_advice) if structured_facts.general_advice else 'Not clearly mentioned'}\n"
                    f"- Follow-up: {structured_facts.follow_up}\n"
                )

        if is_lab:
            system_prompt = (
                "You are Dr. AI — Virtual Health Assistant. Answer the patient's query using the DOCUMENTED LAB TEST RESULTS.\n"
                "STRICT RULES FOR LAB REPORTS:\n"
                "1. Answer under the header '🧪 Lab Report Summary'. Discuss the exact documented lab parameters and values.\n"
                "2. DO NOT mention 'Prescription Summary' or ask the user to 'Please upload your prescription'.\n"
                "3. Explain what the lab parameters mean under 'What These Results Generally Mean (General Medical Education)'.\n"
                "4. DO NOT invent diagnoses (e.g. do not say 'You have anemia' unless explicitly documented).\n"
                "5. State clearly that the documented values should be interpreted together with their Family Doctor.\n"
            )
        else:
            system_prompt = (
                "You are Dr. AI — Virtual Health Assistant. Ground your answer STRICTLY in the provided VALIDATED STRUCTURED DOCUMENT FACTS.\n"
                "STRICT RULES:\n"
                "1. ANSWER ONLY FROM THE PROVIDED DOCUMENT FACTS. DO NOT INVENT PATIENT-SPECIFIC FINDINGS.\n"
                "2. DO NOT claim active recovery, clinical stability, infection, fever, breathlessness, or abnormal lab results.\n"
                "3. TEST ORDERED != TEST RESULT. Tests advised (e.g. CBC, LFT, H. Pylori) are ORDERED ONLY. Explicitly clarify that NO test results are present.\n"
                "4. DO NOT infer symptoms from prescribed medicines (e.g., Domperidone != vomiting).\n"
                "5. DO NOT infer patient-specific symptoms from diagnoses. Explain general medical concepts separately under 'What This Means (General Medical Education)'.\n"
                "6. If the user asks about information absent in the document (e.g., 'Is my H. Pylori positive?'), explicitly respond: 'This information is not provided in the uploaded medical record.'\n"
            )
        user_prompt = f"{system_prompt}{doc_scope_str}{fact_str}{context_str}\n\nPatient Query: {message_text}"

        def _call_llm(prompt_text: str) -> Optional[str]:
            if GENAI_SDK_AVAILABLE and gemini_key and len(gemini_key.strip()) > 5:
                try:
                    client = genai.Client()
                    res = client.models.generate_content(model="gemini-2.5-flash", contents=prompt_text)
                    if res and res.text: return res.text.strip()
                except Exception as e:
                    print(f"[SDK Error]: {e}")

            if gemini_key and len(gemini_key.strip()) > 5:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key.strip()}"
                    payload = {"contents": [{"role": "user", "parts": [{"text": prompt_text}]}], "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1000}}
                    with httpx.Client(timeout=15.0) as client:
                        resp = client.post(url, json=payload)
                        if resp.status_code == 200:
                            candidates = resp.json().get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                parts = candidates[0]["content"].get("parts", [])
                                if parts and "text" in parts[0]:
                                    return parts[0]["text"].strip()
                except Exception as e:
                    print(f"[REST Error]: {e}")
            return None

        # --- PASS 1: Generate ---
        raw_reply_1 = _call_llm(user_prompt)

        # --- PASS 1: Validate ---
        pass_1_valid = False
        rej_count_1 = 0
        if raw_reply_1:
            pass_1_valid, _, rej_count_1 = ClaimValidatorEngine.validate_and_classify_claims(
                raw_reply_1, structured_facts, message_text
            )

        if pass_1_valid and raw_reply_1:
            return ChatCompletionResponse(
                session_id=session_id,
                reply_text=raw_reply_1,
                is_ai_generated=True,
                guardrail_triggered=False,
                llm_provider="google_genai_gemini_2.5_flash_live",
                validation_status="PASSED_PASS1",
                rejected_claims_count=0
            )

        # --- PASS 2: Controlled Regeneration ---
        regen_prompt = (
            f"REGENERATE THE RESPONSE STRICTLY USING VALIDATED DOCUMENT FACTS ONLY.\n"
            f"PREVIOUS ATTEMPT REJECTED FOR CONTAINING UNSUPPORTED PATIENT CLAIMS.\n"
            f"Do not invent any patient symptoms, recovery status, or test results.\n\n"
            f"{user_prompt}"
        )
        raw_reply_2 = _call_llm(regen_prompt)

        # --- PASS 2: Validate ---
        pass_2_valid = False
        rej_count_2 = 0
        if raw_reply_2:
            pass_2_valid, _, rej_count_2 = ClaimValidatorEngine.validate_and_classify_claims(
                raw_reply_2, structured_facts, message_text
            )

        if pass_2_valid and raw_reply_2:
            return ChatCompletionResponse(
                session_id=session_id,
                reply_text=raw_reply_2,
                is_ai_generated=True,
                guardrail_triggered=False,
                llm_provider="google_genai_gemini_2.5_flash_live_regen",
                validation_status="PASSED_PASS2",
                rejected_claims_count=rej_count_1
            )

        # --- FAIL-CLOSED DETERMINISTIC FALLBACK ---
        fallback_reply = generate_deterministic_safe_fallback(structured_facts, message_text, document_type or (structured_facts.document_type if structured_facts else "all"))
        return ChatCompletionResponse(
            session_id=session_id,
            reply_text=fallback_reply,
            is_ai_generated=True,
            guardrail_triggered=False,
            llm_provider="deterministic_safe_fallback",
            validation_status="FALLBACK_DETERMINISTIC",
            rejected_claims_count=rej_count_1 + rej_count_2
        )

    @staticmethod
    def generate_embedding(text: str, dim: int = 1536) -> List[float]:
        """
        Generates Gemini text-embedding vector (with normalized 1536-dim fallback).
        """
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key and len(gemini_key.strip()) > 5:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_key.strip()}"
                payload = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": text[:2000]}]}
                }
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        vec = resp.json().get("embedding", {}).get("values", [])
                        if vec:
                            if len(vec) < dim:
                                vec = vec + [0.0] * (dim - len(vec))
                            elif len(vec) > dim:
                                vec = vec[:dim]
                            norm = math.sqrt(sum(v * v for v in vec)) or 1.0
                            return [v / norm for v in vec]
            except Exception as e:
                print(f"[Gemini Embedding API Error]: {e}")

        vec = []
        seed_val = sum(ord(c) for c in text)
        for i in range(dim):
            val = math.sin(seed_val + i * 0.1)
            vec.append(val)
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

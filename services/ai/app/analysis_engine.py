from typing import Dict, Any, List, Optional
import re
from .schemas import StructuredPrescriptionFactBundle, TestStatus


class DocumentAnalysisEngine:
    """
    DocumentAnalysisEngine performs 5-level medical document analysis:
    Level 1: Facts (Documented facts, numbers, prescriptions)
    Level 2: Meaning (Document-grounded interpretations of values)
    Level 3: Important Findings / Patterns (Out-of-range parameters, multi-test relationships)
    Level 4: Relevant Suggestions (Safe next steps, follow-up, doctor discussion)
    Level 5: Missing Information & Safety Guidance
    """

    @classmethod
    def analyze_document(cls, fact_bundle: Optional[StructuredPrescriptionFactBundle]) -> Dict[str, Any]:
        if not fact_bundle:
            return {
                "abnormalities": [],
                "patterns": [],
                "interpretations": [],
                "suggestions": ["Consult your Family Doctor for personal medical guidance."],
                "missing_info": ["No extracted document facts available."]
            }

        abnormalities = cls.identify_abnormalities(fact_bundle)
        patterns = cls.identify_patterns(fact_bundle)
        interpretations = cls.generate_interpretations(fact_bundle)
        suggestions = cls.generate_relevant_suggestions(fact_bundle)
        missing_info = cls.identify_missing_information(fact_bundle)

        return {
            "abnormalities": abnormalities,
            "patterns": patterns,
            "interpretations": interpretations,
            "suggestions": suggestions,
            "missing_info": missing_info
        }

    @classmethod
    def identify_abnormalities(cls, fact_bundle: StructuredPrescriptionFactBundle) -> List[Dict[str, Any]]:
        abnormalities = []
        for tr in fact_bundle.test_results:
            flag_low = (tr.flag or "").lower()
            val_str = tr.value.strip()

            is_abnormal = flag_low in ("low", "high", "abnormal")
            ref_range = tr.reference_range or ""

            # Check numeric range if provided
            if ref_range and ref_range != "Not specified" and not is_abnormal:
                nums = re.findall(r"[-+]?\d*\.\d+|\d+", ref_range)
                val_nums = re.findall(r"[-+]?\d*\.\d+|\d+", val_str)
                if len(nums) == 2 and len(val_nums) == 1:
                    try:
                        low_b = float(nums[0])
                        high_b = float(nums[1])
                        v = float(val_nums[0])
                        if v < low_b:
                            flag_low = "low"
                            is_abnormal = True
                        elif v > high_b:
                            flag_low = "high"
                            is_abnormal = True
                    except ValueError:
                        pass

            if is_abnormal:
                abnormalities.append({
                    "parameter": tr.parameter,
                    "value": tr.value,
                    "unit": tr.unit,
                    "reference_range": tr.reference_range,
                    "flag": flag_low or "abnormal"
                })

        return abnormalities

    @classmethod
    def identify_patterns(cls, fact_bundle: StructuredPrescriptionFactBundle) -> List[str]:
        patterns = []
        params = {tr.parameter.lower(): tr for tr in fact_bundle.test_results}

        # Glycemic Pattern
        glucose_keys = [k for k in params if "glucose" in k or "sugar" in k or "hba1c" in k]
        if len(glucose_keys) >= 2:
            patterns.append(
                "Glycemic Pattern: Multiple blood glucose metrics are documented on this report. "
                "Evaluating fasting glucose alongside HbA1c provides a broader picture of glycemic regulation over time."
            )

        # Red Blood Cell / Anemia Pattern
        rbc_keys = [k for k in params if "hemoglobin" in k or "hb" in k or "rbc" in k or "hematocrit" in k]
        if len(rbc_keys) >= 1:
            low_rbc = [k for k in rbc_keys if params[k].flag in ("low", "abnormal")]
            if low_rbc:
                patterns.append(
                    "Red Blood Cell Indices Pattern: Documented red blood cell parameters include values below reference ranges. "
                    "In clinical practice, red blood cell metrics are interpreted together to understand oxygen-carrying capacity."
                )

        # Lipid Pattern
        lipid_keys = [k for k in params if "cholesterol" in k or "triglycerides" in k or "hdl" in k or "ldl" in k]
        if len(lipid_keys) >= 2:
            patterns.append(
                "Lipid Profile Pattern: Multiple lipid fractions are documented. "
                "Cardiovascular risk assessment evaluates total cholesterol, LDL, HDL, and triglycerides in combination."
            )

        # Liver Enzyme Pattern
        liver_keys = [k for k in params if "alt" in k or "ast" in k or "sgpt" in k or "sgot" in k or "bilirubin" in k]
        if len(liver_keys) >= 2:
            patterns.append(
                "Hepatic Panel Pattern: Multiple liver enzyme markers are documented. "
                "Liver function assessment evaluates ALT, AST, and total bilirubin together."
            )

        # Prescription Treatment Plan Pattern
        if fact_bundle.diagnosis and fact_bundle.medicines:
            patterns.append(
                f"Documented Treatment Plan Pattern: The prescription specifies medications for treatment of {', '.join(fact_bundle.diagnosis)}. "
                "The medication regimen is designed by your physician to target acidity, inflammation, or symptom management as documented."
            )

        return patterns

    @classmethod
    def generate_interpretations(cls, fact_bundle: StructuredPrescriptionFactBundle) -> List[str]:
        interpretations = []

        for tr in fact_bundle.test_results:
            param_lower = tr.parameter.lower()
            unit_str = f" {tr.unit}" if tr.unit else ""
            ref_str = f" (reference range: {tr.reference_range})" if tr.reference_range and tr.reference_range != "Not specified" else ""

            if tr.flag in ("low", "abnormal"):
                interpretations.append(
                    f"The documented {tr.parameter} value of {tr.value}{unit_str} is below the provided laboratory reference range{ref_str}."
                )
            elif tr.flag in ("high", "abnormal"):
                interpretations.append(
                    f"The documented {tr.parameter} value of {tr.value}{unit_str} is above the provided laboratory reference range{ref_str}."
                )
            else:
                interpretations.append(
                    f"The documented {tr.parameter} value of {tr.value}{unit_str} is within the provided laboratory reference range{ref_str}."
                )

        if fact_bundle.diagnosis:
            for d in fact_bundle.diagnosis:
                interpretations.append(
                    f"Documented Diagnosis: {d}. The documented treatment plan is prescribed specifically to address this condition."
                )

        return interpretations

    @classmethod
    def generate_relevant_suggestions(cls, fact_bundle: StructuredPrescriptionFactBundle) -> List[str]:
        suggestions = []

        abnormalities = cls.identify_abnormalities(fact_bundle)
        if abnormalities:
            suggestions.append("Discuss any out-of-range or abnormal laboratory parameters with your Family Doctor for personalized clinical interpretation.")
            suggestions.append("Review full panel results together rather than interpreting individual parameters in isolation.")

        if fact_bundle.tests_advised:
            advised_names = [t.test_name for t in fact_bundle.tests_advised]
            suggestions.append(f"Complete the advised tests ordered by your physician: {', '.join(advised_names)}.")

        if fact_bundle.general_advice:
            for a in fact_bundle.general_advice:
                suggestions.append(f"Follow doctor's documented instructions: {a}.")

        if fact_bundle.follow_up and fact_bundle.follow_up != "Not clearly mentioned in the uploaded document.":
            suggestions.append(f"Schedule your follow-up consultation as documented: {fact_bundle.follow_up}.")

        if not suggestions:
            suggestions.append("Discuss these documented findings during your next routine consultation with your healthcare provider.")

        return suggestions

    @classmethod
    def identify_missing_information(cls, fact_bundle: StructuredPrescriptionFactBundle) -> List[str]:
        missing = []

        if fact_bundle.tests_advised and not fact_bundle.test_results:
            missing.append("Actual numeric lab test results for advised/ordered tests (e.g. CBC, LFT, H. Pylori) are not present in this document.")

        if not fact_bundle.diagnosis and not fact_bundle.test_results:
            missing.append("No explicit clinical diagnosis or numeric lab values were identified in this document.")

        if fact_bundle.follow_up == "Not clearly mentioned in the uploaded document.":
            missing.append("Specific follow-up timeframe is not explicitly documented on this report.")

        missing.append("Subjective physical symptoms (e.g., fever, pain, fatigue) are not documented in this static report.")

        return missing

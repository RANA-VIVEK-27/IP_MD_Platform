import os
import math
import json
import httpx
from typing import List
from .schemas import ChatCompletionResponse

try:
    from google import genai
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False

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

EMERGENCY_RESPONSE = (
    "🚨 URGENT MEDICAL NOTICE: Your query contains indicators of a potential medical emergency. "
    "Please seek immediate emergency medical care or call your local emergency services (112 / 108 / 911) right away. "
    "Do not delay seeking professional emergency assistance."
)


class GeminiChatEngine:
    @staticmethod
    def process_chat_message(
        session_id: str,
        message_text: str,
        document_type: str = None,
        is_first_message: bool = False,
        rag_context: List[str] = None,
        pharmacy_price_context: List[str] = None
    ) -> ChatCompletionResponse:
        """
        Executes Google Gemini 2.5 Flash chat completion with:
        1. Red-flag emergency symptom detection -> escalates immediately to emergency notice.
        2. Document-type scoping & RAG grounding context insertion.
        3. Best-price pharmacy medicine price recommendation integration.
        4. google-genai SDK call (gemini-2.5-flash) with fallback.
        """
        lowered = message_text.lower()
        emergency_triggered = any(kw in lowered for kw in EMERGENCY_KEYWORDS)

        if emergency_triggered:
            reply = (
                f"{NON_DIAGNOSTIC_DISCLAIMER}\n\n{EMERGENCY_RESPONSE}"
                if is_first_message else EMERGENCY_RESPONSE
            )
            return ChatCompletionResponse(
                session_id=session_id,
                reply_text=reply,
                is_ai_generated=True,
                guardrail_triggered=True,
                llm_provider="google_genai_gemini_2.5_flash_guardrail",
            )

        gemini_key = os.getenv("GEMINI_API_KEY")

        doc_scope_str = f"\n[Active Document Type Scope: {document_type.upper()}]" if document_type else ""

        context_str = ""
        if rag_context:
            context_str += "\n\nClinical Document Grounding Context:\n" + "\n".join(f"- {c}" for c in rag_context)

        if pharmacy_price_context:
            context_str += "\n\nPharmacy Best Price Data:\n" + "\n".join(f"- {p}" for p in pharmacy_price_context)

        live_reply = None
        llm_provider = "google_genai_gemini_2.5_flash_simulated"

        system_prompt = (
            "You are Dr. AI — Senior Virtual Doctor & Health Guide for the IPMD Platform. "
            "Your role is to guide the patient empathetically and accurately on WHAT IS HAPPENING IN THEIR BODY based on their uploaded document context:\n"
            "- PRESCRIPTION SCOPE: Explain what condition is being treated, how each prescribed medicine acts inside the body, dosage timings, potential side effects, and precautions.\n"
            "- LAB REPORT SCOPE: Translate blood/lab metrics (e.g. Fasting Glucose, HbA1c, Cholesterol, Hemoglobin, Kidney/Liver parameters) into plain-language organ health explanations. Explain what normal vs abnormal values mean for their body health and provide supportive doctor lifestyle guidance.\n"
            "- GENERAL REPORT SCOPE: Provide a clear doctor's summary of diagnostic findings, bodily health status, and actionable recommendations.\n"
            "If pharmacy pricing data is available, highlight best prices and generic savings clearly. "
            "Always include appropriate professional guidance while delivering empathetic, doctor-quality explanations."
        )
        user_prompt = f"{system_prompt}{doc_scope_str}{context_str}\n\nPatient Query: {message_text}"

        # 1. Try google.genai official SDK with gemini-2.5-flash
        if GENAI_SDK_AVAILABLE and gemini_key and len(gemini_key.strip()) > 5:
            try:
                client = genai.Client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=user_prompt,
                )
                if response and response.text:
                    live_reply = response.text.strip()
                    llm_provider = "google_genai_gemini_2.5_flash_live"
            except Exception as e:
                print(f"[Google GenAI SDK Error]: {e}")

        # 2. Fallback to HTTP REST endpoint if SDK call fails or unavailable
        if not live_reply and gemini_key and len(gemini_key.strip()) > 5:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key.strip()}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1000}
                }
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(url, json=payload)
                    if resp.status_code == 200:
                        res_data = resp.json()
                        candidates = res_data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                live_reply = parts[0]["text"].strip()
                                llm_provider = "google_gemini_rest_live"
            except Exception as e:
                print(f"[Gemini REST API Error]: {e}")

        if not live_reply:
            main_body = (
                f"🩺 **Doctor's Body Health Guidance**:\n"
                f"Regarding your query on '{message_text[:60]}...':\n"
                f"Based on your document context, prescribed medications work targetedly to regulate physiological systems. "
                f"Be sure to follow dosage schedules strictly. Review side effects and consult your doctor for any changes.{context_str}"
            )
        else:
            main_body = live_reply

        if is_first_message:
            full_reply = f"{NON_DIAGNOSTIC_DISCLAIMER}\n\n{main_body}"
        else:
            full_reply = main_body

        return ChatCompletionResponse(
            session_id=session_id,
            reply_text=full_reply,
            is_ai_generated=True,
            guardrail_triggered=False,
            llm_provider=llm_provider,
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

import os
import math
import json
import httpx
from typing import List
from .schemas import ChatCompletionResponse

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
        is_first_message: bool = False,
        rag_context: List[str] = None
    ) -> ChatCompletionResponse:
        """
        Executes Google Gemini 1.5 chat completion with:
        1. Red-flag emergency symptom detection -> escalates immediately to emergency notice.
        2. RAG grounding context insertion.
        3. First-turn non-diagnostic mandatory disclaimer.
        4. Live Gemini 1.5 API call when GEMINI_API_KEY is configured.
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
                llm_provider="google_gemini_1.5_guardrail",
            )

        gemini_key = os.getenv("GEMINI_API_KEY")

        context_str = ""
        if rag_context:
            context_str = "\n\nClinical Knowledge Base Grounding Context:\n" + "\n".join(f"- {c}" for c in rag_context)

        live_reply = None
        llm_provider = "google_gemini_1.5_flash_simulated"

        if gemini_key and len(gemini_key.strip()) > 5:
            try:
                system_prompt = (
                    "You are an empathetic, accurate AI Health Assistant for the IPMD Platform. "
                    "Provide clear, professional health informational guidance. "
                    "Always emphasize consulting a doctor for diagnoses or prescription modifications."
                )
                user_prompt = f"{system_prompt}{context_str}\n\nPatient Query: {message_text}"

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key.strip()}"
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [{"text": user_prompt}]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 1000
                    }
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
                                llm_provider = "google_gemini_1.5_flash_live"
            except Exception as e:
                # Log error and fall back gracefully
                print(f"[Gemini API Error]: {e}")

        if not live_reply:
            main_body = (
                f"Thank you for your health inquiry regarding '{message_text[:60]}...'. "
                f"Prescribed medications should be taken strictly as directed by your physician. "
                f"Always review dosage guidelines, potential interactions, and side effects before usage.{context_str}"
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

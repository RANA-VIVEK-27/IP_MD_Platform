I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
INTEGRATION PLAN DOCUMENT 
Version 1.0  |  Draft for Review 
Prepared: July 2026 
Document 7 of 7 — Project Documentation Suite 

Document Control 
Field Detail 
Document Title Integration Plan Document — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Technical & Stakeholder Review 
Prepared Date July 2026 
Derived From 
BRD_IPMD_Platform_v1 (v1.0), TRD_IPMD_Platform_v1 (v1.0), Database Schema 
Document (v1.0), API_Collection_IPMD_Platform_v1 (v1.0), 
App_Flow_Document_IPMD_Platform_v1 (v1.0), UI/UX Document (v1.0) 
Related Documents BRD, TRD, Database Schema, API Collection, App Flow, UI/UX 
 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD, TRD, Database Schema, API 
Collection, App Flow, and UI/UX v1.0 
Product/Technical 
Team 
 

Table of Contents 
1.  Introduction ................................................................................................................................................ 4 
2.  Integration Landscape Overview ................................................................................................................ 5 
3.  Payments Integration — Razorpay ............................................................................................................. 6 
4.  Push Notifications — Firebase Cloud Messaging ........................................................................................ 8 
5.  Email Integration ....................................................................................................................................... 10 
6.  SMS Integration (India DLT-Compliant Gateway) ..................................................................................... 11 
7.  OAuth Login — Google & Apple ................................................................................................................ 12 
8.  AI/ML Provider Integrations ..................................................................................................................... 13 
9.  Credential & Secrets Management ........................................................................................................... 15 
10.  Environment & Release Plan ................................................................................................................... 16 
11.  Cross-Cutting Integration Controls ......................................................................................................... 17 
12.  Integration Testing & Go-Live Checklist .................................................................................................. 19 
13.  Integration Risks & Mitigations ............................................................................................................... 20 
14.  Glossary ................................................................................................................................................... 21 
 

I.P. & M.D Platform — Integration Plan Document 
Page 4 of 21 
1. Introduction 
1.1 Purpose 
This Integration Plan Document defines the step-by-step provisioning, configuration, security, and testing 
plan for every third-party service the I.P. & M.D Platform depends on: Razorpay (payments), Firebase Cloud 
Messaging (push notifications), a transactional email provider, an India DLT-compliant SMS gateway, OAuth 
providers (Google/Apple), and the AI/ML provider layer (OCR, medical NLP, and LLM chat). It is the final 
document in the seven-document suite and is intended to be actionable by the engineering and DevOps 
teams responsible for standing up each integration. 
1.2 Scope of This Document 
This document covers account/credential provisioning, environment-specific configuration 
(development/staging/production), the request/response and webhook contracts already defined in the API 
Collection Document (Doc 4), security and secrets-handling requirements from the TRD (Doc 2), and a go-live 
checklist per integration. It does not redefine endpoint-level schemas — those remain owned by the API 
Collection Document — and it does not redefine UI treatment of integration-driven states (e.g., payment 
failure) — those remain owned by the UI/UX Document (Doc 6). 
1.3 How to Read This Document 
Sections 3–8 are organized per integration, each following the same structure: Purpose & Scope, Provisioning 
Steps, Configuration & Environments, Request/Response & Webhook Summary (cross-referenced to the API 
Collection Document), Security Requirements, and a Testing Checklist. Sections 9–13 are cross-cutting and 
apply to all integrations uniformly. 
1.4 Reference Documents 
Document What This Document Draws From It 
BRD_IPMD_Platform_v1 Business rationale for each integration; India-launch regulatory constraints (DPDP Act, 
DLT, data localization) 
TRD_IPMD_Platform_v1 Technology choices (Razorpay, FCM, DLT SMS gateway), security architecture, 
environments, technical risk register 
Database Schema Document Fields written by each integration (payment_intent_id, razorpay_order_id, notification 
records, consent_record_id) 
API Collection Document Exact endpoint contracts, error codes, and the webhook and rate-limiting 
specifications this plan operationalizes 
App Flow Document The screen-level sequence in which each integration is invoked (e.g., Payment Method 
→ Razorpay Checkout SDK → Payment Confirmation) 
UI/UX Document How integration-driven states (payment failure, AI disclosure, compliance gate) are 
rendered to the user 
 

I.P. & M.D Platform — Integration Plan Document 
Page 5 of 21 
2. Integration Landscape Overview 
Six third-party integration surfaces support the platform's V1 scope. Each is provisioned once per 
environment (Development, Staging, Production) per TRD Section 9.1. 
Integration Provider Primary Purpose Criticality 
Payments Razorpay Card/UPI/netbanking/wallet capture, 
refunds, partner settlement Critical 
Push Notifications Firebase Cloud Messaging Order/verification/dispatch/refill/report-
flag push alerts High 
Email 
Transactional email 
provider (SES/SendGrid-
class) 
Order and account notifications Medium 
SMS India DLT-compliant SMS 
gateway OTP login, order/dispatch alerts Critical 
OAuth Login Google, Apple Low-friction patient registration/login Medium 
AI/ML Layer 
OCR provider, medical 
NLP model, LLM provider 
(via LangChain) 
Prescription/report extraction, AI health 
chat Critical 
Criticality reflects impact on the core BRD flow (upload → verify → order → pay) if the integration is degraded or unavailable; it 
informs the monitoring and fallback requirements in Section 11. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 6 of 21 
3. Payments Integration — Razorpay 
3.1 Purpose & Scope 
Implements BRD FR-16 to FR-18 and TRD Section 4.5. Razorpay is the platform's sole payment gateway for 
V1, supporting cards, UPI, netbanking, and wallets. Server-side order creation always precedes client 
payment initiation; client-only payment confirmation is never trusted (TRD Item 18). 
3.2 Provisioning Steps 
• 1. Register the platform's Razorpay merchant account; complete KYB (Know Your Business) verification 
required before live-mode credentials are issued. 
• 2. Generate API key pairs (key_id / key_secret) separately for Test mode (Development/Staging) and Live 
mode (Production) — Razorpay issues distinct credentials per mode. 
• 3. Configure a webhook endpoint in the Razorpay Dashboard pointing to POST /webhooks/razorpay for 
each environment, and generate a distinct webhook signing secret per environment. 
• 4. Enable the specific payment methods required (Cards, UPI, Netbanking, Wallets) in the Razorpay 
Dashboard settlement configuration. 
• 5. Configure Razorpay Route or an equivalent split-settlement mechanism if partner-pharmacy payout 
automation (App Flow 4.4.1, Payout/Settlement) is enabled in this phase; otherwise payouts are 
reconciled manually against the payout_ledger. 
3.3 Configuration & Environments 
Environment Razorpay Mode Notes 
Development Test mode, shared test credentials Synthetic/mock data only, per TRD 
Section 9.1 
Staging Test mode, dedicated staging credentials 
Mirrors production configuration at 
smaller scale; used for pre-production 
validation and the integration-test suite 
gating production deploys (TRD Section 
9.2) 
Production Live mode 
Live credentials provisioned only after 
KYB completion; stored per Section 9 of 
this document 
3.4 API & Webhook Summary 
Full request/response schemas are defined in the API Collection Document, Section 3.6 (Payments) and 
Section 3.11 (Webhooks). Summary of the integration surface: 
Endpoint Purpose 
POST /payments/orders Creates a Razorpay order server-side for a platform order prior to client payment 
initiation; returns razorpay_order_id for client SDK initiation 
POST /payments/capture Confirms client-side payment completion (razorpay_payment_id, razorpay_signature) 
and reconciles against the Razorpay Orders API before marking the order paid 

I.P. & M.D Platform — Integration Plan Document 
Page 7 of 21 
GET /payments/{payment_id} Returns payment/refund status and reconciliation state 
POST /payments/refunds Processes a refund for a cancelled/returned/out-of-stock item via Razorpay's Refund 
API 
POST /webhooks/razorpay Receives asynchronous events (payment.captured, payment.failed, refund.processed) 
from Razorpay; verifies X-Razorpay-Signature before processing 
Idempotency-Key is mandatory on POST /orders, POST /payments/orders, POST /payments/capture, and 
POST /payments/refunds — a retried request with the same key returns the original response without 
reprocessing, per API Collection Section 2.7. 
3.5 Reconciliation & Split-Fulfillment Settlement 
• A nightly reconciliation job compares internal order-ledger records against Razorpay's settlement 
reports; discrepancies raise an Admin-panel alert (TRD Item 20). 
• Split-fulfillment orders are modeled as one payment intent with multiple linked fulfillment records, or 
multiple linked payment captures where partner-pharmacy settlement requires separate transfer 
records (TRD Item 19) — the specific mechanism (single-intent vs. multi-capture) is finalized during the 
technical spike referenced in TRD Section 11.1 and documented here once selected. 
• Partner-pharmacy payouts are net of platform commission and surfaced via the payout_ledger (App Flow 
4.4.1). 
3.6 Security Requirements 
• All webhook-receiving endpoints verify the Razorpay signature before any processing; unverified 
requests are rejected with SIGNATURE_VERIFICATION_FAILED and never queued (API Collection Section 
3.11). 
• Webhook handlers are idempotent, keyed by the Razorpay event ID, to safely absorb provider retries 
(TRD Item 21). 
• key_secret and the webhook signing secret are stored exclusively in the protected configuration store 
defined in Section 9 — never in application code, client bundles, or plaintext environment files 
committed to source control. 
• Handler responds within Razorpay's required timeout window and offloads reconciliation/heavy 
processing to a background job (TRD Section 6.1). 
3.7 Testing Checklist 
• Successful capture across all four payment methods (card, UPI, netbanking, wallet) in Test mode. 
• Signature verification rejects a tampered/forged webhook payload. 
• Duplicate webhook delivery (same event ID) does not double-process a payment. 
• Full and partial refund flows, including REFUND_AMOUNT_EXCEEDS_CAPTURED rejection. 
• AMOUNT_MISMATCH is correctly raised when a tampered client amount does not match the platform's 
expected order total. 
• Nightly reconciliation job correctly flags a deliberately-introduced ledger discrepancy in Staging. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 8 of 21 
4. Push Notifications — Firebase Cloud Messaging 
4.1 Purpose & Scope 
Implements BRD FR-19. FCM delivers push notifications for order confirmation, doctor verification result, 
dispatch, delivery, refill reminders, and abnormal report flags, per TRD Item 22. 
4.2 Provisioning Steps 
• 1. Create a Firebase project per environment (or a single project with separate app registrations for 
Development/Staging/Production, per team preference). 
• 2. Register the Flutter mobile app (iOS + Android) and the web app (if web push is enabled) within the 
Firebase project; download and securely store the resulting service account credentials. 
• 3. Configure Apple Push Notification service (APNs) certificates/keys within Firebase for iOS delivery. 
• 4. Integrate the FCM SDK into the Flutter client to obtain and register device tokens against the 
authenticated user's account. 
4.3 Configuration & Channel Model 
The notification service consumes domain events from an internal event/queue bus and fans out to Firebase 
(push), email, and SMS channels based on the user's per-channel opt-in preferences (TRD Item 22), managed 
via PATCH /notifications/preferences. 
Endpoint Purpose 
GET /notifications Lists in-app notification records for the authenticated user, unread-first 
PATCH 
/notifications/preferences 
Updates per-channel (push_enabled/email_enabled/sms_enabled) opt-in flags used 
by the fan-out engine 
POST /notifications/test Sends a test notification through a specified channel for operational verification (e.g., 
after a Firebase/SMS gateway credential rotation) 
4.4 Delivery Semantics 
• Delivery is best-effort with retry/backoff; failed sends are logged for Admin visibility but never block the 
underlying business transaction (TRD Item 23) — an order still confirms even if a push notification fails to 
deliver. 
4.5 Security Requirements 
• Firebase service-account credentials are stored in the protected configuration store (Section 9), scoped 
to the minimum permission needed to send messages. 
• Device tokens are stored against the user record with the same field-level access logging applied to other 
account data (TRD Section 7.2). 
4.6 Testing Checklist 
• POST /notifications/test successfully delivers a push notification on iOS and Android in Staging. 

I.P. & M.D Platform — Integration Plan Document 
Page 9 of 21 
• Disabling push_enabled suppresses future push sends without affecting email/SMS delivery for the same 
event. 
• A simulated FCM outage does not block order placement, dispatch, or payment capture. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 10 of 21 
5. Email Integration 
5.1 Purpose & Scope 
A transactional email provider (SES/SendGrid-class, per TRD Section 3.5) delivers order and account 
notifications as one of the three fan-out channels defined in BRD FR-19. 
5.2 Provisioning Steps 
• 1. Provision a transactional email account/API key with the selected provider, separate for Staging and 
Production. 
• 2. Verify the sending domain (SPF, DKIM, and DMARC records) to maximize inbox deliverability and 
reduce spam-folder routing for time-sensitive alerts (e.g., abnormal report flags). 
• 3. Build and version-control transactional templates for each event type: order confirmation, doctor 
verification result, dispatch, delivery, refill reminder, abnormal report flag. 
5.3 Configuration & Environments 
Environment Configuration 
Development Provider sandbox/test mode; emails captured by a test inbox tool rather than sent to 
real addresses 
Staging Provider sandbox with verified test domain; used for template QA and integration 
testing 
Production Live provider account with verified production sending domain and monitored 
bounce/complaint rates 
5.4 Security Requirements 
• Provider API keys stored in the protected configuration store (Section 9); never embedded in client code. 
• PII is never included in email server logs or bounce-handling logs beyond what the provider requires 
operationally (TRD Section 7.2). 
5.5 Testing Checklist 
• Each of the six event-type templates renders correctly and passes spam-score/deliverability checks in 
Staging. 
• email_enabled = false correctly suppresses sends for that user without affecting other channels. 
• Bounce/complaint webhooks (if supported by the chosen provider) are captured for Admin visibility. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 11 of 21 
6. SMS Integration (India DLT-Compliant Gateway) 
6.1 Purpose & Scope 
Implements OTP-based login (BRD Section 3.1) and order/dispatch SMS alerts (BRD FR-19), via an SMS 
gateway compliant with India's Distributed Ledger Technology (DLT) regulations for commercial SMS, per TRD 
Section 3.5. 
6.2 Provisioning Steps 
• 1. Select an SMS gateway provider offering India DLT-compliant routes for both OTP (transactional) and 
promotional/alert traffic. 
• 2. Complete DLT entity registration (Principal Entity registration with the telecom-authorized DLT 
platform) and register the platform's sender ID(s). 
• 3. Register and get approval for each SMS content template (OTP message, order confirmation, dispatch 
alert, refill reminder) against the DLT platform — unregistered template text will be blocked at the 
carrier level regardless of gateway configuration. 
• 4. Provision gateway API credentials per environment (sandbox credentials for Development/Staging per 
TRD Section 9.1; live credentials for Production). 
6.3 API Summary 
Endpoint Purpose 
POST /auth/otp/request Sends a one-time password to the supplied phone number via the SMS gateway (India 
DLT-compliant) 
POST /auth/otp/verify Verifies the OTP and issues a JWT access/refresh token pair 
OTP delivery targets a short validity window (implementation-tuned); expired or mismatched codes return 
OTP_INVALID_OR_EXPIRED per the API Collection's consolidated error reference (Section 4.2). 
6.4 Security & Compliance Requirements 
• Only DLT-registered templates are used in production sends — any new alert type requires DLT template 
approval before it can go live, and this lead time should be planned into feature rollout schedules. 
• OTP request endpoints are rate-limited (10 requests/minute per phone or IP per API Collection Section 5) 
to mitigate SMS-bombing abuse. 
• Phone numbers are treated as PII with the same access-logging and retention controls as other account 
data (BRD Section 7, DPDP Act alignment). 
6.5 Testing Checklist 
• OTP delivery and verification succeed end-to-end in Staging using sandbox credentials. 
• Rate limiting correctly returns RATE_LIMITED after the threshold is exceeded. 
• A DLT-unregistered template is confirmed to fail at the carrier level in a controlled test, validating the 
registration-first process before any new template ships. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 12 of 21 
7. OAuth Login — Google & Apple 
7.1 Purpose & Scope 
Implements BRD Section 3.1's "Continue with Google / Continue with Apple" registration/login option, 
reducing registration friction for patients (App Flow Section 3.1, step 9). 
7.2 Provisioning Steps 
• 1. Register OAuth client applications with Google Cloud Console and Apple Developer (Sign in with Apple 
service ID), one set of credentials per environment. 
• 2. Configure authorized redirect URIs for each environment's web and mobile app deep-link scheme. 
• 3. Configure the mobile app's platform-specific OAuth client (Android application ID + SHA fingerprint for 
Google; Apple's Services ID and key for Sign in with Apple). 
7.3 API Summary 
Endpoint Purpose 
POST /auth/oauth/callback 
Completes an OAuth authorization-code exchange (Google/Apple) and issues the 
standard token pair, creating a Patient account on first login if none exists 
(is_new_user = true) 
7.4 Security Requirements 
• OAuth client secrets are stored in the protected configuration store (Section 9); the authorization-code 
exchange happens server-side, never trusting a client-supplied identity assertion directly. 
• OAUTH_PROVIDER_ERROR is returned distinctly from generic authentication failures so the client can 
render appropriate retry guidance (API Collection Section 3.1). 
7.5 Testing Checklist 
• First-time Google/Apple login correctly creates a new Patient account (is_new_user = true) and issues a 
valid token pair. 
• Returning-user login correctly matches the existing account rather than creating a duplicate. 
• A revoked/expired OAuth session on the provider side is handled gracefully with a clear re-authentication 
prompt. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 13 of 21 
8. AI/ML Provider Integrations 
8.1 Purpose & Scope 
Covers the OCR engine, medical NLP model, and LLM provider that power the AI Comprehension Pipeline and 
AI Health Chat Assistant (TRD Section 3.3). Unlike the other integrations in this document, final provider 
selection is subject to a technical spike (TRD Section 11.1) — this section defines the provisioning and 
governance plan around whichever provider(s) are selected, not a fixed vendor contract. 
8.2 Provisioning Steps 
• 1. Evaluate and select an OCR provider capable of handling both printed and handwritten prescriptions 
(managed cloud vision/document OCR API, with Tesseract retained as an offline fallback per TRD Section 
3.3). 
• 2. Evaluate and select or fine-tune a medical-domain NER/NLP model for structuring extracted text into 
medicine name, strength, dosage, frequency, duration, and lab test values. 
• 3. Select an LLM provider for the AI Health Chat Assistant with acceptable data-handling terms for a 
healthcare-adjacent use case — no training on customer data by default, or an equivalent contractual 
guarantee (TRD Section 11.1 assumption). 
• 4. Provision API credentials for each selected provider per environment, and configure LangChain 
orchestration with scoped prompts and RAG grounding over the medicine/FAQ corpus (TRD Section 3.3). 
• 5. Establish a labeled handwriting benchmark set for ongoing model evaluation, tracked against the BRD 
KPI (≥95% field-level accuracy on clear, typed prescriptions, tracked separately for handwritten) and the 
technical risk register (TRD Section 10). 
8.3 Guardrails & Non-Diagnostic Scope 
• Every AI-generated interpretation (extraction result or chat response) is returned with a structured 
is_ai_generated: true flag — a contract-level guarantee (TRD Item 36), not left to per-screen UI copy. 
• Diagnostic- or emergency-sounding chat queries trigger guardrail_triggered = true and a fixed 
doctor/emergency redirect response, replacing free-form LLM generation entirely for that turn (App Flow 
4.1.3). 
• Confidence scoring (model-native plus custom rule-based thresholds) drives mandatory doctor-review 
routing for low-confidence fields — the AI layer is never the sole authority on dispensing (BRD Section 
8.2 constraint). 
8.4 Security & Compliance Requirements 
• Uploaded prescription/report images and PDFs are virus-scanned and stored immutably before being 
passed to the OCR pipeline (App Flow 4.1.2). 
• Chat logs are retained only with recorded consent (consent_record_id) and are purged ahead of the 
configured DPDP retention period on user request (App Flow 4.1.3, TRD Section 5.3). 
• AI/ML services run on separate, autoscaled node pools from core transactional services to prevent bursty 
inference workloads from degrading order/payment performance (TRD Section 10). 
8.5 Testing Checklist 

I.P. & M.D Platform — Integration Plan Document 
Page 14 of 21 
• Extraction turnaround meets the 15–30 second target for a typical document under representative load 
(BRD Section 6). 
• A diagnostic-sounding chat query correctly triggers the guardrail redirect rather than a free-form 
response. 
• Low-confidence extracted fields are correctly routed to the doctor verification queue rather than auto-
actioned. 
• Chat session deletion correctly purges message history within the configured retention window. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 15 of 21 
9. Credential & Secrets Management 
9.1 Protected Configuration Store 
All third-party credentials referenced in Sections 3–8 (Razorpay keys/webhook secret, Firebase service 
account, email provider API key, SMS gateway credentials, OAuth client secrets, AI/ML provider API keys) are 
stored in a single protected configuration store with change-history versioning, per TRD Item 31 and BRD FR-
27. 
• Credential values are never returned in plaintext via any API response — GET /super-admin/settings 
returns only a masked payment_gateway_credential_ref; updates via PATCH /super-admin/settings 
accept a write-only payment_gateway_credential field that is never echoed back (API Collection Section 
3.9). 
• Every settings change increments a config_version and is captured in the append-only audit log store 
alongside every other admin-tier action (App Flow 4.7.2, TRD Section 7.4). 
• Only the Super Admin role can view credential references or trigger a credential rotation (BRD FR-27); 
Admin and User Admin tokens are explicitly rejected on this endpoint group at the API-authorization 
layer (TRD Item 26). 
9.2 Rotation Policy 
• Payment gateway, SMS gateway, and email provider credentials are rotated on a defined schedule 
(aligned with each provider's security recommendations) and immediately upon suspected compromise. 
• Rotation is tested first in Staging using that environment's sandbox credentials before a corresponding 
Production rotation is performed. 
• POST /notifications/test is used as the standard operational check after any Firebase/SMS credential 
rotation (API Collection Section 3.7). 
 

I.P. & M.D Platform — Integration Plan Document 
Page 16 of 21 
10. Environment & Release Plan 
Mirrors TRD Section 9 exactly, applied specifically to third-party integration credentials and endpoints. 
Environment Purpose Integration Credential Posture 
Development Feature development and integration 
testing; synthetic/mock data only 
Shared sandbox/test credentials for all 
integrations; SMS/email typically mocked or 
captured by a test-inbox tool rather than sent 
externally 
Staging Pre-production validation; mirrors 
production configuration at smaller scale 
Dedicated sandbox credentials for 
Razorpay/Firebase/SMS/email/OAuth per TRD 
Section 9.1; this is where the full integration-
test suite (Section 12) runs, gating production 
deploys 
Production Live environment; India cloud region; full 
monitoring and backup policies active 
Live-mode credentials for every integration, 
provisioned only after the corresponding 
provider's KYB/verification/registration step 
(Sections 3–7) is complete 
10.1 Release Gating 
• Staging deploys are automatic on merge; production deploys are gated behind manual approval plus a 
passing integration-test suite (TRD Section 9.2) — this suite includes the per-integration testing checklists 
in Sections 3–8 of this document. 
• Database migrations affecting integration-linked fields (e.g., payment_intent_id, device tokens, 
consent_record_id) follow the same versioned migration/rollback path as all other schema changes (TRD 
Section 9.2). 
• Razorpay live-mode credentials and the SMS gateway's DLT registration are explicit go-live dependencies 
(TRD Section 11.2) and should be tracked on the release plan with enough lead time for provider-side 
approval delays, particularly DLT template approval (Section 6.2). 
 

I.P. & M.D Platform — Integration Plan Document 
Page 17 of 21 
11. Cross-Cutting Integration Controls 
11.1 Idempotency 
Idempotency-Key is required on all state-mutating financial endpoints: POST /orders, POST 
/payments/orders, POST /payments/capture, and POST /payments/refunds. A retried request with the same 
key returns the original response without reprocessing (API Collection Section 2.7) — this is the primary 
safeguard against double-charging on client retry or network flakiness, which is common on the variable 
connectivity assumed for the target market (BRD Section 8.1). 
11.2 Webhook Handling 
All webhook-receiving endpoints (currently Razorpay only) verify provider signatures before processing and 
respond within the provider's required timeout, offloading heavy processing to background jobs. Handlers 
are idempotent, keyed by the provider's event ID, so provider-side retries never double-process an event (API 
Collection Section 2.8, TRD Item 21). 
11.3 Rate Limiting 
Endpoint Class Limit Notes 
Public/auth endpoints (login, OTP request) 10 req/min per 
phone or IP Primary defense against OTP/SMS-bombing abuse 
Authenticated read endpoints (catalog, 
orders, notifications) 
120 req/min per 
user — 
Authenticated write endpoints (uploads, 
orders, payments) 
30 req/min per 
user — 
Admin/Super Admin endpoints 60 req/min per 
user 
Additional anomaly-based throttling on audit-log and 
settings endpoints 
Rate-limited responses return HTTP 429 with a Retry-After header and error_code = RATE_LIMITED (API 
Collection Section 5); clients must surface the retry interval rather than looping immediate retries against an 
integration provider. 
11.4 Error Envelope Consistency 
Every integration surfaces failures through the platform's consistent error envelope (machine-readable 
error_code, human-readable message, optional field_errors), never a raw provider error passed through 
unfiltered — this includes payment failures (AMOUNT_MISMATCH, SIGNATURE_VERIFICATION_FAILED), OTP 
failures (OTP_INVALID_OR_EXPIRED), and OAuth failures (OAUTH_PROVIDER_ERROR), per the API 
Collection's consolidated error reference (Section 4). 
11.5 Monitoring & Alerting 
• Payment success rate is tracked as a rolling 30-day metric on the Admin dashboard 
(payment_success_rate_30d) against the BRD KPI target of ≥98% (BRD Section 9, API Collection Section 
3.8). 

I.P. & M.D Platform — Integration Plan Document 
Page 18 of 21 
• Failed notification sends (push/email/SMS) are logged for Admin visibility without blocking the 
underlying transaction (TRD Item 23). 
• Nightly Razorpay reconciliation discrepancies raise an explicit Admin-panel alert (TRD Item 20). 
• Observability stack (Prometheus/Grafana, ELK/OpenSearch, Sentry per TRD Section 3.6) instruments 
each integration's latency and error rate as a first-class dashboard, not just application-level logs. 
 

I.P. & M.D Platform — Integration Plan Document 
Page 19 of 21 
12. Integration Testing & Go-Live Checklist 
Consolidates the per-integration checklists in Sections 3–8 into a single pre-launch gate. All items must pass 
in Staging before a Production go-live is approved, per the release-gating policy in Section 10.1. 
# Checklist Item Owning Section 
1 All four Razorpay payment methods (card, UPI, 
netbanking, wallet) succeed end-to-end in Test mode 3.7 
2 Razorpay webhook signature verification rejects a forged 
payload 3.7 
3 Duplicate webhook/payment retries do not double-
process 3.7 / 11.1 / 11.2 
4 Nightly reconciliation correctly flags a deliberate ledger 
discrepancy 3.7 
5 FCM push delivers successfully on iOS and Android 4.6 
6 A simulated notification-channel outage does not block a 
core transaction 4.6 / 4.4 
7 Email templates pass deliverability checks on the verified 
sending domain 5.5 
8 OTP request/verify succeeds end-to-end with DLT-
approved templates 6.5 
9 SMS/OTP rate limiting correctly triggers RATE_LIMITED 6.5 / 11.3 
10 Google and Apple OAuth login correctly create/match 
Patient accounts 7.5 
11 AI extraction turnaround meets the 15–30s target under 
representative load 8.5 
12 Chat guardrail redirect fires correctly on 
diagnostic/emergency-sounding input 8.5 
13 All live-mode credentials (Razorpay, SMS DLT registration) 
are provisioned and verified 9 / 10 
14 Credential rotation has been rehearsed in Staging for 
every integration 9.2 
 

I.P. & M.D Platform — Integration Plan Document 
Page 20 of 21 
13. Integration Risks & Mitigations 
Integration-specific extension of the technical risk register in TRD Section 10. 
Risk Impact Mitigation 
Razorpay payment/refund 
inconsistency Medium 
Idempotent webhook handling keyed by provider event ID; 
nightly automated reconciliation with Admin-panel 
discrepancy alerts (TRD Item 20/21) 
DLT template rejection 
delaying a new SMS alert type Medium 
Submit template registration to the DLT platform in parallel 
with feature development, not after; maintain an approved-
template inventory as part of release planning 
FCM/email/SMS channel 
outage Low–Medium Best-effort delivery with retry/backoff; failures logged, never 
block the underlying business transaction (TRD Item 23) 
AI/ML provider data-handling 
terms unsuitable for health 
data 
High 
LLM/OCR/NLP providers evaluated specifically for no-training-
on-customer-data guarantees before selection (TRD Section 
11.1); contractual review precedes integration 
Payment gateway credential 
leakage High 
Credentials held exclusively in the protected configuration 
store, never in code or client bundles; write-only credential 
fields never echoed back (Section 9.1) 
OAuth provider outage 
blocking login Low Email/OTP login remains available as a fallback authentication 
path independent of OAuth provider availability 
 

I.P. & M.D Platform — Integration Plan Document 
Page 21 of 21 
14. Glossary 
Term Definition 
DLT Distributed Ledger Technology registration — India's regulatory framework for 
commercial SMS, requiring entity and template registration 
KYB Know Your Business — the merchant verification process required before Razorpay 
issues live-mode credentials 
Idempotency Key A client-supplied unique key ensuring a retried request (order, payment) is not 
processed twice 
Webhook An asynchronous, provider-initiated HTTP callback (e.g., Razorpay payment events) 
verified by signature before processing 
is_ai_generated A structured flag returned with every AI-extracted field or chat reply, guaranteeing 
consistent non-diagnostic disclosure at the contract level 
Guardrail (Chat) The fixed disclaimer/redirect response path used instead of free-form LLM generation 
for diagnostic or emergency-sounding queries 
Sandbox / Test Mode A provider's non-production credential and environment set used for 
Development/Staging integration testing 
This Integration Plan Document is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0), 
TRD_IPMD_Platform_v1 (v1.0), Database Schema Document (v1.0), API_Collection_IPMD_Platform_v1 (v1.0), 
App_Flow_Document_IPMD_Platform_v1 (v1.0), and the UI/UX Document (v1.0). As the final document in the seven-
document suite, any integration change identified during implementation should be reflected back into those documents 
first, then propagated here. 


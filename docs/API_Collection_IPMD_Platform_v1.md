API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 1 of 38 
 
I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
API COLLECTION DOCUMENT 
Version 1.0 | Draft for Review 
Prepared: July 2026 
Document 4 of 7 — Project Documentation Suite 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 2 of 38 
Document Control 
Document Title API Collection Document — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Technical & Stakeholder Review 
Prepared Date July 2026 
Derived From TRD_IPMD_Platform_v1 (Technical Requirement Document, v1.0) and 
BRD_IPMD_Platform_v1 (v1.0) 
Base URL https://api.ipmd-platform.in/api/v1 
Related Documents BRD, TRD, Database Schema, App Flow, UI/UX, Integration Plan 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD v1.0 and TRD v1.0 Technical/Engineering Team 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 3 of 38 
1. Introduction 
1.1 Purpose 
This API Collection Document provides endpoint-level contracts for Version 1 (V1) of the I.P. & M.D Platform. It translates 
the module-wise technical requirements defined in the Technical Requirement Document (TRD_IPMD_Platform_v1, Section 
4) into concrete REST API definitions: request/response schemas, authentication and role requirements, and error codes, 
for use by frontend (web/mobile), backend, and QA teams during implementation and integration testing.  
1.2 Scope of This Document 
This document covers endpoint-level contracts only. Full entity-relationship definitions and field-level database constraints 
are maintained in the companion Database Schema document (Doc 3). Screen -by-screen flows that consume these 
endpoints are maintained in the App Flow document (Doc 5). Where relevant, endpoints reference the BRD functional 
requirement numbers (e.g., FR-5.3) and TRD module sections they implement. 
1.3 Reference Documents 
Document Purpose 
BRD_IPMD_Platform_v1 Business goals, scope, roles, functional requirements 
TRD_IPMD_Platform_v1 System architecture, tech stack, module-wise technical requirements, security architecture 
Database Schema (Doc 3) Entity-relationship model, table definitions, constraints 
App Flow (Doc 5) Screen-by-screen and state-transition flow for web/mobile 
UI/UX (Doc 6) Wireframes, design system, accessibility annotations 
Integration Plan (Doc 7) Step-by-step third-party integration and credential/config plan 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 4 of 38 
2. API Conventions 
These conventions apply uniformly to every endpoint in this collection and are carried forward from TRD Section 6 (API 
Design Principles). 
2.1 Base URL & Versioning 
● Base URL (Production, India region): https://api.ipmd-platform.in/api/v1 
● Base URL (Staging): https://staging-api.ipmd-platform.in/api/v1 
● All endpoints are prefixed with /api/v1. Breaking changes are introduced via a new version prefix (/api/v2), never as an 
in-place mutation of an existing contract. 
2.2 Authentication & Authorization 
● Authentication uses short-lived JWT access tokens (default TTL: 15 minutes) plus refresh tokens (default TTL: 30 days), 
issued by the /auth endpoints. 
● Authenticated requests must include: Authorization: Bearer <access_token> 
● Role claims are embedded in the JWT and validated at the API Gateway/BFF layer on every request. Authorization is 
enforced per-endpoint (not just by role name) to support the granular permission model introduced by Super Admin 
(BRD FR-26). 
● Endpoints below list the roles permitted to call them, drawn from the seven platform role types: Patient, Doctor, 
Pharmacy Staff (Owned), Partner Pharmacy, Admin, User Admin, Super Admin. 
2.3 Standard Request Headers 
Common Headers 
Field Type Required Description 
Authorization string Conditional Bearer <access_token>. Required on all endpoints except 
public auth/catalog-browse endpoints. 
Content-Type string Yes application/json for JSON bodies; multipart/form-data for file 
uploads. 
Idempotency-Key string (UUID) Conditional 
Required on all state-mutating financial endpoints (order 
creation, payment capture, refund) to safely handle client 
retries. 
X-Request-ID string (UUID) Optional Client-supplied correlation ID, echoed back in the response 
and logs for traceability. 
Accept-Language string Optional Reserved for future multi-language support (Phase 3); defaults 
to en-IN in V1. 
2.4 Pagination 
List endpoints expected to grow large (orders, catalog, audit logs) use cursor -based pagination: 
Pagination Query Parameters 
Field Type Required Description 
limit integer No Max items per page. Default 20, max 100. 
cursor string No Opaque cursor returned by the previous page's next_cursor. Omit to 
fetch the first page. 
Pagination Response Envelope 
Field Type Required Description 
data array  The page of results. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 5 of 38 
Field Type Required Description 
next_cursor string | null  Cursor to fetch the next page; null if this is the last page. 
has_more boolean  Whether additional pages exist. 
2.5 Standard Response Envelope 
Successful responses return the resource or list directly (optionally wrapped in the pagination envelope above). Every AI -
generated field (extraction results, chat responses) includes an is_ai_generated flag per TRD Section 7.3 (Item 36) / BRD 
Compliance Section 7. 
2.6 Error Handling 
All error responses use a consistent envelope: 
Error Envelope 
Field Type Description 
error_code string Machine-readable error code (e.g., PRESCRIPTION_NOT_VERIFIED). 
message string Human-readable description of the error. 
field_errors array | null Optional list of {field, issue} objects for validation failures. 
request_id string Correlation ID for support/debugging. 
Compliance-block errors (e.g., checkout blocked on an unverified Schedule H item) return a distinct, explicit error_code so 
clients render the correct guidance rather than a generic failure. A consolidated error code reference is provided in Section  
5. 
2.7 Idempotency 
Idempotency-Key is required on: POST /orders, POST /payments/orders, POST /payments/capture, POST 
/payments/refunds. Replaying a request with the same key returns the original response without reprocessing.  
2.8 Webhooks 
Webhook-receiving endpoints (Razorpay) verify provider signatures before processing and respond within provider -
required timeouts, offloading heavy processing to background jobs. Webhook handlers are idempotent, keyed by the 
provider's event ID. 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 6 of 38 
3. Endpoint Collection by Module 
Endpoints are grouped by the nine functional modules defined in TRD Section 4 (Module -Wise Technical Requirements), 
which itself maps to BRD Section 5 (Functional Requirements by Module). Each endpoint lists the roles permitted to call it 
and the BRD/TRD requirement it implements. 
3.1 Identity & Access 
Implements authentication, session, profile, and account-lifecycle operations underlying all seven role types (BRD Section 4). 
Role/permission enforcement per TRD Section 7.1. 
POST  /auth/register 
Roles Permitted: Public 
Requirement Ref: BRD FR (Patient/Doctor/Pharmacy Staff registration, Section 3.1) 
Registers a new Patient, Doctor, or Pharmacy Staff account. Doctor registrations additionally require a medical 
license/registration number and remain in `pending` status until User Admin KYC verification (BRD FR -23). 
Request Body 
Field Type Required Description 
role string (enum) Yes One of: patient, doctor, pharmacy_staff_owned, 
partner_pharmacy. 
full_name string Yes Full legal name. 
email string Conditional Required if phone is not supplied. 
phone string Conditional E.164 format; required if email is not supplied. 
password string Yes Minimum 8 characters; hashed server-side, never logged. 
license_number string Conditional Required when role = doctor. Cross-checked during KYC (TRD 
Item 27). 
pharmacy_details object Conditional Required when role = partner_pharmacy or 
pharmacy_staff_owned (name, address, GSTIN). 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Newly created user identifier. 
role string Assigned role. 
status string active for patients; pending for doctor/pharmacy roles awaiting verification. 
created_at string (ISO 8601) Registration timestamp. 
Error Codes 
● VALIDATION_ERROR — malformed or missing required field 
● EMAIL_ALREADY_EXISTS 
● PHONE_ALREADY_EXISTS 
● LICENSE_FORMAT_INVALID 
Note: Doctor and pharmacy-role accounts cannot obtain an access token until User Admin activates the account (see Section 
3.9). 
POST  /auth/otp/request 
Roles Permitted: Public 
Requirement Ref: BRD Section 3.1 — Register/login (OTP) 
Sends a one-time password to the supplied phone number via the SMS gateway (India DLT -compliant). 
Request Body 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 7 of 38 
Field Type Required Description 
phone string Yes E.164 format phone number. 
Response Body (200/201) 
Field Type Description 
otp_request_id string (UUID) Reference used in the verify call. 
expires_in integer OTP validity window in seconds (default 300). 
Error Codes 
● RATE_LIMITED — too many OTP requests for this number 
● INVALID_PHONE_FORMAT 
POST  /auth/otp/verify 
Roles Permitted: Public 
Requirement Ref: BRD Section 3.1 
Verifies an OTP and issues a JWT access/refresh token pair. OTP-based and OAuth login flows issue the same token pair 
post-authentication (TRD Section 6.1). 
Request Body 
Field Type Required Description 
otp_request_id string (UUID) Yes Value returned by /auth/otp/request. 
otp_code string Yes 6-digit code received via SMS. 
Response Body (200/201) 
Field Type Description 
access_token string (JWT) Short-lived access token (15 min TTL). 
refresh_token string Long-lived refresh token (30 day TTL). 
user object Summary of the authenticated user (user_id, role, status). 
Error Codes 
● OTP_INVALID_OR_EXPIRED 
● ACCOUNT_SUSPENDED 
● ACCOUNT_PENDING_VERIFICATION 
POST  /auth/login 
Roles Permitted: Public 
Requirement Ref: BRD Section 3.1 
Authenticates via email/password and issues a JWT access/refresh token pair.  
Request Body 
Field Type Required Description 
email string Yes Registered email address. 
password string Yes Account password. 
Response Body (200/201) 
Field Type Description 
access_token string (JWT) Short-lived access token. 
refresh_token string Long-lived refresh token. 
user object Summary of the authenticated user. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 8 of 38 
Error Codes 
● INVALID_CREDENTIALS 
● ACCOUNT_SUSPENDED 
● ACCOUNT_PENDING_VERIFICATION 
POST  /auth/oauth/callback 
Roles Permitted: Public 
Requirement Ref: BRD Section 3.1 — OAuth login 
Completes an OAuth authorization-code exchange (Google/Apple) and issues the standard token pair, creating a Patient 
account on first login if one does not already exist. 
Request Body 
Field Type Required Description 
provider string (enum) Yes google | apple. 
auth_code string Yes Authorization code returned by the provider. 
Response Body (200/201) 
Field Type Description 
access_token string (JWT) Short-lived access token. 
refresh_token string Long-lived refresh token. 
user object Summary of the authenticated user. 
is_new_user boolean True if this call created the account. 
Error Codes 
● OAUTH_PROVIDER_ERROR 
● ACCOUNT_SUSPENDED 
POST  /auth/refresh 
Roles Permitted: Authenticated (any role, via refresh token) 
Requirement Ref: TRD Section 6.1 
Exchanges a valid refresh token for a new access/refresh token pair. Fails immediately if the account has been suspended 
since the refresh token was issued (TRD Section 7.1 — live status flag, not just token expiry). 
Request Body 
Field Type Required Description 
refresh_token string Yes Previously issued refresh token. 
Response Body (200/201) 
Field Type Description 
access_token string (JWT) New short-lived access token. 
refresh_token string New refresh token (rotated). 
Error Codes 
● REFRESH_TOKEN_INVALID_OR_EXPIRED 
● ACCOUNT_SUSPENDED 
POST  /auth/logout 
Roles Permitted: All authenticated roles 
Requirement Ref: TRD Section 6.1 
Revokes the supplied refresh token (and, where session-tracking is enabled, the associated session record). 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 9 of 38 
Request Body 
Field Type Required Description 
refresh_token string Yes Token to revoke. 
Response Body (200/201) 
Field Type Description 
revoked boolean Always true on success. 
Error Codes 
● REFRESH_TOKEN_INVALID 
GET  /users/me 
Roles Permitted: All authenticated roles 
Requirement Ref: BRD Section 3.1 
Returns the authenticated user's profile, role, and status. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) User identifier. 
role string Assigned role. 
full_name string Full name. 
email string | null Email address, if set. 
phone string | null Phone number, if set. 
status string active | pending | suspended. 
created_at string (ISO 8601) Account creation timestamp. 
Error Codes 
● UNAUTHORIZED 
PATCH  /users/me 
Roles Permitted: All authenticated roles 
Requirement Ref: BRD Section 3.1 
Updates editable profile fields (name, contact preferences, saved addresses). Role and status cannot be changed via this 
endpoint. 
Request Body 
Field Type Required Description 
full_name string No Updated full name. 
notification_preferences object No Per-channel opt-in flags (push/email/SMS) feeding Section 3.7. 
saved_addresses array No List of address objects for delivery. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) User identifier. 
updated_fields array List of fields that were changed. 
Error Codes 
● VALIDATION_ERROR 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 10 of 38 
GET  /users/{user_id} 
Roles Permitted: Admin, User Admin, Super Admin 
Requirement Ref: BRD Section 4.1 — Admin tier account management 
Retrieves the full profile and status history for a given user account.  
Response Body (200/201) 
Field Type Description 
user_id string (UUID) User identifier. 
role string Assigned role. 
status string Current status. 
status_history array List of {status, reason_code, changed_by, changed_at}. 
Error Codes 
● USER_NOT_FOUND 
● FORBIDDEN — role lacks permission for this endpoint 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 11 of 38 
3.2 Prescription & Report Intake 
Implements BRD FR-1 to FR-5 and TRD Section 4.1. Covers upload, OCR/Medical NLP extraction, confidence -based routing, 
and the Schedule H/H1/X dispensing gate. 
POST  /prescriptions/upload 
Roles Permitted: Patient 
Requirement Ref: BRD FR-1, FR-2, FR-3 | TRD Item 1–3 
Uploads a prescription image/PDF via signed, size-limited multipart upload. Triggers an async OCR → Medical NLP 
extraction job (TRD Item 3). 
Special Headers: Content-Type: multipart/form-data 
Request Body 
Field Type Required Description 
file binary 
(jpg/png/pdf) Yes Max size per platform setting; default suggested 20 MB. 
doctor_id string (UUID) No Linked prescribing/reviewing doctor, if known. 
document_type string (enum) Yes prescription (reports use /reports/upload). 
Response Body (200/201) 
Field Type Description 
prescription_id string (UUID) Identifier for polling status/results. 
document_id string (UUID) Immutable reference to the stored original file. 
status string queued — extraction job has been enqueued. 
Error Codes 
● FILE_TOO_LARGE 
● UNSUPPORTED_FILE_TYPE 
● MALWARE_SCAN_FAILED — file rejected by virus scan 
Note: Original file is retained immutably in object storage and referenced only by document_id (TRD Item 2).  
GET  /prescriptions/{prescription_id}/status 
Roles Permitted: Patient (own record), Doctor (assigned), Admin 
Requirement Ref: TRD Item 6 — 15–30s target latency 
Polling endpoint (or WebSocket-backed status callback) for extraction progress. Clients poll this until status reaches 
extracted or failed. 
Response Body (200/201) 
Field Type Description 
status string (enum) queued | processing | extracted | needs_review | failed. 
progress_pct integer Approximate completion percentage. 
is_ai_generated boolean Always true once extracted — per TRD Item 36 AI-output labeling. 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
GET  /prescriptions/{prescription_id} 
Roles Permitted: Patient (own record), Doctor (assigned/on-call), Admin 
Requirement Ref: BRD FR-3, FR-4 | TRD Item 3–4 
Returns the full structured extraction result: medicine name, strength, dosage, frequency, duration, prescribing doctor, 
date, each with a per-field confidence score. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 12 of 38 
Response Body (200/201) 
Field Type Description 
prescription_id string (UUID) Prescription identifier. 
verification_status string (enum) pending_review | doctor_verified | rejected. 
extracted_fields array List of {field_id, field_name, value, confidence_score, review_state}. 
is_ai_generated boolean AI-output disclosure flag (TRD Item 36). 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
● FORBIDDEN 
GET  /prescriptions 
Roles Permitted: Patient (own), Doctor (assigned), Admin 
Requirement Ref: BRD Section 3.1 — view order history/prescriptions 
Lists prescriptions for the authenticated patient, or those assigned to the authenticated doctor.  
Query Parameters 
Field Type Required Description 
status string No Filter by verification_status. 
limit integer No Page size (default 20, max 100). 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of prescription summaries. 
next_cursor string | null Pagination cursor. 
Error Codes 
● UNAUTHORIZED 
POST  /reports/upload 
Roles Permitted: Patient 
Requirement Ref: BRD FR-1, FR-3 | TRD Item 3 
Uploads a diagnostic report (blood report, sonography, CT scan, etc.) for OCR/Medical NLP extraction of test name, value, 
unit, reference range, and normal/abnormal flag. 
Special Headers: Content-Type: multipart/form-data 
Request Body 
Field Type Required Description 
file binary 
(jpg/png/pdf) Yes Max size per platform setting. 
report_type string No e.g., blood_panel, sonography, ct_scan — used for NLP model 
routing. 
Response Body (200/201) 
Field Type Description 
report_id string (UUID) Identifier for polling status/results. 
document_id string (UUID) Immutable reference to the stored original file. 
status string queued. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 13 of 38 
Error Codes 
● FILE_TOO_LARGE 
● UNSUPPORTED_FILE_TYPE 
● MALWARE_SCAN_FAILED 
GET  /reports/{report_id} 
Roles Permitted: Patient (own record), Doctor (granted access), Admin 
Requirement Ref: BRD FR-3 — abnormal value flagging with plain-language explanation 
Returns structured report values plus an AI-generated plain-language explanation for any flag = abnormal entries. 
Response Body (200/201) 
Field Type Description 
report_id string (UUID) Report identifier. 
values array List of {test_name, value, unit, reference_range, flag}. 
ai_explanation string | null Plain-language explanation, present when any value is flagged abnormal. 
is_ai_generated boolean AI-output disclosure flag. 
Error Codes 
● REPORT_NOT_FOUND 
● FORBIDDEN 
PATCH  /prescriptions/{prescription_id}/fields/{field_id} 
Roles Permitted: Doctor (assigned/on-call reviewer) 
Requirement Ref: BRD FR-4, FR-10 | TRD Item 12 
Edits a single extracted field's value during doctor review. Distinct from the verification -action endpoints in Section 3.3, 
which record the overall approve/reject decision. 
Request Body 
Field Type Required Description 
value string Yes Corrected field value. 
reason string No Optional free-text reason for the correction. 
Response Body (200/201) 
Field Type Description 
field_id string (UUID) Field identifier. 
value string Updated value. 
review_state string doctor_edited. 
Error Codes 
● FIELD_NOT_FOUND 
● FORBIDDEN — doctor not assigned to this prescription 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 14 of 38 
3.3 AI Health Chat Assistant 
Implements BRD FR-6 to FR-8 and TRD Section 4.2. All responses pass through the guardrail/RAG layer described in TRD 
Items 7–9 before being returned. 
POST  /chat/consent 
Roles Permitted: Patient 
Requirement Ref: BRD FR-8 | TRD Item 10 — DPDP consent capture 
Captures explicit consent to log chat interactions, required before the first message of a session is persisted.  
Request Body 
Field Type Required Description 
consent_given boolean Yes True to allow logging; false disables persistence for this user. 
Response Body (200/201) 
Field Type Description 
consent_record_id string (UUID) Reference used to link future chat logs. 
consent_given boolean Recorded value. 
recorded_at string (ISO 8601) Timestamp. 
Error Codes 
● VALIDATION_ERROR 
POST  /chat/sessions 
Roles Permitted: Patient 
Requirement Ref: BRD FR-6 | TRD Item 7 
Starts a new AI Health Chat Assistant session, scoped to general health information, medicine information, and platform 
navigation only. 
Request Body 
Field Type Required Description 
context object No Optional linkage, e.g., {prescription_id} to ground the 
conversation in a specific upload. 
Response Body (200/201) 
Field Type Description 
session_id string (UUID) Chat session identifier. 
created_at string (ISO 8601) Session start timestamp. 
Error Codes 
● CONSENT_REQUIRED — chat consent has not been recorded for this user 
POST  /chat/sessions/{session_id}/messages 
Roles Permitted: Patient 
Requirement Ref: BRD FR-6, FR-7 | TRD Item 7–9 
Sends a user message and returns the assistant's reply. Diagnostic -sounding or emergency-indicating queries are 
intercepted by the guardrail layer and receive a fixed disclaimer plus doctor/emergency -resource redirect rather than free-
form generation (TRD Item 8). Replies are grounded via RAG over the curated medicine/FAQ knowledge base (TRD Item 9).  
Request Body 
Field Type Required Description 
message string Yes User's chat message text. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 15 of 38 
Response Body (200/201) 
Field Type Description 
message_id string (UUID) Identifier of the stored exchange. 
reply string Assistant's response text. 
is_ai_generated boolean Always true — per TRD Item 36 AI-output labeling. 
guardrail_triggered boolean True if the fixed disclaimer/redirect path was used instead of free-form 
generation. 
disclaimer string Non-diagnostic disclaimer text, always present. 
Error Codes 
● SESSION_NOT_FOUND 
● SESSION_EXPIRED 
GET  /chat/sessions/{session_id}/messages 
Roles Permitted: Patient (own session) 
Requirement Ref: BRD FR-8 
Retrieves the message history for a session, if the user has given logging consent.  
Response Body (200/201) 
Field Type Description 
data array List of {message_id, sender, text, created_at}. 
Error Codes 
● SESSION_NOT_FOUND 
● FORBIDDEN 
DELETE  /chat/sessions/{session_id} 
Roles Permitted: Patient (own session) 
Requirement Ref: TRD Item 10 — purgeable per DPDP retention configuration 
Purges a chat session and its messages ahead of the configured retention period, per the user's DPDP Act data -deletion 
rights. 
Response Body (200/201) 
Field Type Description 
session_id string (UUID) Purged session identifier. 
purged boolean Always true on success. 
Error Codes 
● SESSION_NOT_FOUND 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 16 of 38 
3.4 Doctor Verification Workflow 
Implements BRD FR-9 to FR-11 and TRD Section 4.3. Every action here writes an immutable, timestamped entry to the audit 
log store (TRD Item 12). 
GET  /verification/queue 
Roles Permitted: Doctor 
Requirement Ref: BRD FR-9 | TRD Item 11 
Returns the authenticated doctor's assigned-and-pending prescriptions/reports, plus any on-call pool items assigned via 
round-robin/load-based strategy. 
Query Parameters 
Field Type Required Description 
status string No Filter by needs_review (default). 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {prescription_id, patient_ref, queued_at, sla_breach}. 
next_cursor string | null Pagination cursor. 
Error Codes 
● FORBIDDEN — caller is not a Doctor 
POST  /verification/{prescription_id}/approve 
Roles Permitted: Doctor (assigned/on-call) 
Requirement Ref: BRD FR-10 | TRD Item 12 
Approves the AI-extracted prescription as-is, setting verification_status = doctor_verified. Required before any linked 
Schedule H/H1/X order can proceed to checkout (BRD FR-5, FR-15). 
Request Body 
Field Type Required Description 
notes string No Optional reviewer notes. 
Response Body (200/201) 
Field Type Description 
prescription_id string (UUID) Prescription identifier. 
verification_status string doctor_verified. 
audit_log_id string (UUID) Reference to the immutable audit entry created for this action. 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
● FORBIDDEN — doctor not assigned to this item 
● ALREADY_VERIFIED 
POST  /verification/{prescription_id}/reject 
Roles Permitted: Doctor (assigned/on-call) 
Requirement Ref: BRD FR-10 
Rejects the prescription with a mandatory reason, blocking any dependent order flow.  
Request Body 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 17 of 38 
Field Type Required Description 
reason string Yes Mandatory rejection reason. 
Response Body (200/201) 
Field Type Description 
prescription_id string (UUID) Prescription identifier. 
verification_status string rejected. 
audit_log_id string (UUID) Reference to the immutable audit entry. 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
● FORBIDDEN 
● REASON_REQUIRED 
GET  /verification/{prescription_id}/audit-log 
Roles Permitted: Doctor (assigned), Admin, Super Admin 
Requirement Ref: BRD FR-11 | TRD Item 12 
Returns the immutable, timestamped history of every verification action taken on this prescription.  
Response Body (200/201) 
Field Type Description 
data array List of {actor_id, actor_role, action, timestamp, notes_or_reason}. 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 18 of 38 
3.5 Medicine Catalog & Ordering 
Implements BRD FR-12 to FR-15 and TRD Section 4.4, including the non-bypassable Schedule H/H1/X checkout gate (TRD 
Item 17, enforced at the service layer per TRD Item 34). 
GET  /catalog/medicines 
Roles Permitted: Public / Patient 
Requirement Ref: BRD FR-12 
Searches the unified medicine catalog (owned-inventory and partner-pharmacy SKUs, de-duplicated by standard medicine 
identifier). 
Query Parameters 
Field Type Required Description 
q string No Free-text search term (brand or generic name). 
schedule string No Filter by regulatory schedule (otc, h, h1, x). 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {medicine_id, name, generic_name, schedule, price, in_stock}. 
next_cursor string | null Pagination cursor. 
GET  /catalog/medicines/{medicine_id} 
Roles Permitted: Public / Patient 
Requirement Ref: BRD FR-12, FR-13 
Returns full catalog detail for a single medicine, including linked owned -inventory and partner-pharmacy stock records and 
generic-equivalent mappings. 
Response Body (200/201) 
Field Type Description 
medicine_id string (UUID) Catalog identifier. 
name string Brand name. 
generic_name string Generic/equivalent name. 
schedule string Regulatory schedule (otc | h | h1 | x). 
stock_sources array List of {source_type (owned|partner), source_id, quantity, price}. 
Error Codes 
● MEDICINE_NOT_FOUND 
POST  /catalog/match 
Roles Permitted: Patient, Doctor 
Requirement Ref: BRD FR-13 | TRD Item 15 
Matches a prescription's extracted line items to catalog SKUs using exact identifier match, generic -equivalent mapping, and 
confidence-scored fuzzy match. Low-confidence matches are returned as suggestions and are never auto -added to a cart. 
Request Body 
Field Type Required Description 
prescription_id string (UUID) Yes Prescription whose extracted fields should be matched. 
Response Body (200/201) 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 19 of 38 
Field Type Description 
matches array List of {field_id, medicine_id, match_type (exact|generic|fuzzy), 
confidence_score, auto_addable}. 
Error Codes 
● PRESCRIPTION_NOT_FOUND 
POST  /cart 
Roles Permitted: Patient 
Requirement Ref: BRD FR-12, FR-14 
Creates a new cart for the authenticated patient. 
Response Body (200/201) 
Field Type Description 
cart_id string (UUID) New cart identifier. 
POST  /cart/{cart_id}/items 
Roles Permitted: Patient 
Requirement Ref: BRD FR-14, FR-15 | TRD Item 17 
Adds a line item to the cart. If the item's schedule is H/H1/X, a prescription_id with verification_status = doctor_verified 
must be attached, or the item is added in a blocked state that prevents checkout.  
Request Body 
Field Type Required Description 
medicine_id string (UUID) Yes Catalog item to add. 
quantity integer Yes Units to order. 
prescription_id string (UUID) Conditional Required for Schedule H/H1/X items. 
Response Body (200/201) 
Field Type Description 
cart_id string (UUID) Cart identifier. 
line_item_id string (UUID) Identifier of the added line item. 
checkout_blocked boolean True if this item lacks a doctor_verified prescription reference. 
Error Codes 
● MEDICINE_NOT_FOUND 
● PRESCRIPTION_REQUIRED 
● OUT_OF_STOCK 
GET  /cart/{cart_id} 
Roles Permitted: Patient (own cart) 
Requirement Ref: BRD FR-14 
Returns cart contents, computed subtotal, and per-item checkout_blocked status. 
Response Body (200/201) 
Field Type Description 
cart_id string (UUID) Cart identifier. 
items array List of {line_item_id, medicine_id, quantity, price, checkout_blocked}. 
subtotal number Sum of line item prices. 
Error Codes 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 20 of 38 
● CART_NOT_FOUND 
● FORBIDDEN 
POST  /orders 
Roles Permitted: Patient 
Requirement Ref: BRD FR-14, FR-15 | TRD Item 14, 16, 17 
Converts a cart to an order. The order-routing engine selects a fulfillment source per line item (stock, price, delivery -SLA), 
falling back to split-fulfillment where required. Hard-blocks at this layer (not just the UI) if any Schedule H/H1/X line item 
lacks a doctor_verified prescription reference (TRD Items 5, 17, 34). 
Special Headers: Idempotency-Key: required 
Request Body 
Field Type Required Description 
cart_id string (UUID) Yes Cart to convert to an order. 
delivery_address_id string (UUID) Yes Saved address to ship to. 
Response Body (200/201) 
Field Type Description 
order_id string (UUID) New order identifier. 
fulfillment_records array List of {line_item_id, source_type, source_id, status}. 
payment_required_amount number Amount to be captured via the Payments module. 
Error Codes 
● CART_EMPTY 
● PRESCRIPTION_NOT_VERIFIED — one or more regulated items lack a doctor_verified prescription 
● IDEMPOTENCY_KEY_REQUIRED 
● OUT_OF_STOCK 
GET  /orders/{order_id} 
Roles Permitted: Patient (own order), Pharmacy Staff (assigned), Admin 
Requirement Ref: BRD Section 3.1 — order status tracking 
Returns full order detail: line items, fulfillment source(s), routing decisions, and current status.  
Response Body (200/201) 
Field Type Description 
order_id string (UUID) Order identifier. 
status string (enum) placed | processing | dispatched | delivered | cancelled. 
line_items array List of {medicine_id, quantity, fulfillment_source, status}. 
payment_status string pending | captured | refunded | failed. 
Error Codes 
● ORDER_NOT_FOUND 
● FORBIDDEN 
GET  /orders 
Roles Permitted: Patient (own), Pharmacy Staff (assigned queue), Admin 
Requirement Ref: BRD Section 3.1 — order history 
Lists orders for the authenticated patient, or the orders routed to the authenticated pharmacy staff member's fulfillment 
queue. 
Query Parameters 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 21 of 38 
Field Type Required Description 
status string No Filter by order status. 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of order summaries. 
next_cursor string | null Pagination cursor. 
POST  /orders/{order_id}/cancel 
Roles Permitted: Patient (own order, pre-dispatch), Admin 
Requirement Ref: BRD FR-18 — refunds for cancelled items 
Cancels an order (or remaining undispatched line items) and triggers the refund flow in the Payments module.  
Request Body 
Field Type Required Description 
reason string No Optional cancellation reason. 
Response Body (200/201) 
Field Type Description 
order_id string (UUID) Order identifier. 
status string cancelled. 
refund_id string (UUID) | null Reference to the refund created, if payment had been captured. 
Error Codes 
● ORDER_NOT_FOUND 
● ORDER_ALREADY_DISPATCHED 
● FORBIDDEN 
POST  /orders/{order_id}/route-override 
Roles Permitted: Admin 
Requirement Ref: BRD Section 4.1 — dispute resolution 
Manually overrides the automated fulfillment-source decision for one or more line items (e.g., resolving a stock discrepancy 
or dispute). 
Request Body 
Field Type Required Description 
line_item_id string (UUID) Yes Line item to re-route. 
new_source_type string (enum) Yes owned | partner. 
new_source_id string (UUID) Yes Target fulfillment source. 
reason string Yes Mandatory justification, persisted to the audit log. 
Response Body (200/201) 
Field Type Description 
line_item_id string (UUID) Line item identifier. 
fulfillment_source string Updated source. 
audit_log_id string (UUID) Reference to the audit entry. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 22 of 38 
Error Codes 
● ORDER_NOT_FOUND 
● LINE_ITEM_NOT_FOUND 
● REASON_REQUIRED 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 23 of 38 
3.6 Payments 
Implements BRD FR-16 to FR-18 and TRD Section 4.5. Server-side order creation always precedes client payment initiation; 
client-only payment confirmation is never trusted (TRD Item 18). 
POST  /payments/orders 
Roles Permitted: Patient 
Requirement Ref: BRD FR-16 | TRD Item 18 
Creates a Razorpay order server-side for a platform order prior to client payment initiation. Supports card, UPI, netbanking, 
and wallet methods via Razorpay Checkout/Orders API. 
Special Headers: Idempotency-Key: required 
Request Body 
Field Type Required Description 
order_id string (UUID) Yes Platform order this payment is for. 
amount number Yes Amount in INR paise, must match the order's 
payment_required_amount. 
Response Body (200/201) 
Field Type Description 
payment_intent_id string (UUID) Internal payment intent identifier. 
razorpay_order_id string Razorpay-side order ID for client checkout initiation. 
amount number Amount in paise. 
Error Codes 
● ORDER_NOT_FOUND 
● AMOUNT_MISMATCH 
● IDEMPOTENCY_KEY_REQUIRED 
POST  /payments/capture 
Roles Permitted: Patient (via client SDK callback) 
Requirement Ref: BRD FR-16, FR-17 | TRD Item 18–19 
Confirms a client-side payment completion signal and reconciles it against the Razorpay Orders API server -side before 
marking the order paid. Split-fulfillment orders may produce multiple linked payment captures.  
Special Headers: Idempotency-Key: required 
Request Body 
Field Type Required Description 
payment_intent_id string (UUID) Yes Intent created via /payments/orders. 
razorpay_payment_id string Yes Payment ID returned by the Razorpay client SDK. 
razorpay_signature string Yes Signature for server-side verification. 
Response Body (200/201) 
Field Type Description 
payment_intent_id string (UUID) Payment intent identifier. 
status string captured | failed. 
order_id string (UUID) Associated platform order. 
Error Codes 
● SIGNATURE_VERIFICATION_FAILED 
● PAYMENT_INTENT_NOT_FOUND 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 24 of 38 
● ALREADY_CAPTURED 
GET  /payments/{payment_id} 
Roles Permitted: Patient (own payment), Admin, Super Admin 
Requirement Ref: BRD FR-18 
Returns payment/refund status and reconciliation state for a given payment.  
Response Body (200/201) 
Field Type Description 
payment_id string (UUID) Payment identifier. 
status string pending | captured | refunded | partially_refunded | failed. 
amount number Amount in paise. 
order_id string (UUID) Associated order. 
Error Codes 
● PAYMENT_NOT_FOUND 
● FORBIDDEN 
POST  /payments/refunds 
Roles Permitted: Patient (own order, eligible states), Admin 
Requirement Ref: BRD FR-18 | TRD Item 20 
Processes a refund for a cancelled, returned, or out-of-stock item via Razorpay's refund API. Nightly reconciliation compares 
refund records against internal order-ledger entries; discrepancies raise an Admin-panel alert. 
Special Headers: Idempotency-Key: required 
Request Body 
Field Type Required Description 
payment_id string (UUID) Yes Payment to refund against. 
amount number Yes Refund amount in paise (supports partial refunds). 
reason string (enum) Yes cancelled | returned | out_of_stock. 
Response Body (200/201) 
Field Type Description 
refund_id string (UUID) New refund record identifier. 
status string processing | completed | failed. 
Error Codes 
● PAYMENT_NOT_FOUND 
● REFUND_AMOUNT_EXCEEDS_CAPTURED 
● IDEMPOTENCY_KEY_REQUIRED 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 25 of 38 
3.7 Notifications 
Implements BRD FR-19 and TRD Section 4.6. Delivery is best-effort with retry/backoff; failed sends are logged for Admin 
visibility but never block the underlying business transaction (TRD Item 23).  
GET  /notifications 
Roles Permitted: All authenticated roles (own notifications) 
Requirement Ref: BRD FR-19 
Lists in-app notification records for the authenticated user (order confirmation, verification result, dispatch, delivery, refill 
reminder, abnormal report flag). 
Query Parameters 
Field Type Required Description 
unread_only boolean No If true, returns only unread notifications. 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {notification_id, type, channel, message, read, created_at}. 
next_cursor string | null Pagination cursor. 
PATCH  /notifications/preferences 
Roles Permitted: All authenticated roles 
Requirement Ref: BRD FR-19 
Updates per-channel (push/email/SMS) notification opt-in preferences used by the fan-out engine. 
Request Body 
Field Type Required Description 
push_enabled boolean No Enable/disable Firebase push. 
email_enabled boolean No Enable/disable transactional email. 
sms_enabled boolean No Enable/disable SMS. 
Response Body (200/201) 
Field Type Description 
updated boolean Always true on success. 
Error Codes 
● VALIDATION_ERROR 
POST  /notifications/test 
Roles Permitted: Admin, Super Admin 
Requirement Ref: TRD Section 3.6 — operational tooling 
Sends a test notification through a specified channel for operational verification (e.g., after a Firebase/SMS gateway 
configuration change). 
Request Body 
Field Type Required Description 
user_id string (UUID) Yes Target user for the test send. 
channel string (enum) Yes push | email | sms. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 26 of 38 
Response Body (200/201) 
Field Type Description 
delivery_log_id string (UUID) Reference to the delivery attempt log. 
status string sent | failed. 
Error Codes 
● USER_NOT_FOUND 
● CHANNEL_NOT_CONFIGURED 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 27 of 38 
3.8 Admin Panel — Operations 
Implements BRD FR-20 to FR-22 and TRD Section 4.7. All endpoints require the `admin` role claim, enforced server -side (TRD 
Item 26); `user_admin` tokens are explicitly rejected (TRD Item 25). 
GET  /admin/dashboard/summary 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-20 
Returns aggregate operational metrics (orders, inventory turnover, fulfillment performance) via dedicated reporting 
queries/materialized views, avoiding load on transactional tables (TRD Item 24).  
Response Body (200/201) 
Field Type Description 
orders_today integer Count of orders placed today. 
fulfillment_sla_breach_count integer Orders currently breaching delivery SLA. 
doctor_verification_queue_depth integer Items awaiting doctor review. 
payment_success_rate_30d number Rolling 30-day payment success rate. 
Error Codes 
● FORBIDDEN 
GET  /admin/partner-pharmacies 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-20 — partner pharmacy onboarding 
Lists onboarded partner pharmacies, their catalog scope, and fulfillment radius.  
Query Parameters 
Field Type Required Description 
status string No Filter by onboarding status. 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {partner_id, name, fulfillment_radius_km, status}. 
next_cursor string | null Pagination cursor. 
Error Codes 
● FORBIDDEN 
POST  /admin/partner-pharmacies 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-20 
Onboards a new partner pharmacy, including catalog scope and fulfillment radius.  
Request Body 
Field Type Required Description 
name string Yes Partner pharmacy legal/trade name. 
address object Yes Registered address. 
fulfillment_radius_km number Yes Delivery radius used by the order-routing engine. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 28 of 38 
Field Type Required Description 
catalog_feed_url string No Digital stock/pricing feed endpoint, if available (BRD 
Assumption). 
Response Body (200/201) 
Field Type Description 
partner_id string (UUID) New partner pharmacy identifier. 
status string pending_activation. 
Error Codes 
● VALIDATION_ERROR 
● FORBIDDEN 
PATCH  /admin/partner-pharmacies/{partner_id} 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-20 
Updates partner pharmacy details, catalog scope, or activation status; supports automatic temporary de -listing on stale-
feed detection (TRD Risk Register). 
Request Body 
Field Type Required Description 
status string (enum) No active | suspended | delisted. 
fulfillment_radius_km number No Updated delivery radius. 
Response Body (200/201) 
Field Type Description 
partner_id string (UUID) Partner identifier. 
status string Updated status. 
Error Codes 
● PARTNER_NOT_FOUND 
● FORBIDDEN 
GET  /admin/orders/disputes 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-20 — dispute resolution 
Lists orders flagged for dispute resolution (routing conflicts, partner stock discrepancies, refund reconciliation mismatches ). 
Query Parameters 
Field Type Required Description 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {order_id, dispute_type, flagged_at}. 
next_cursor string | null Pagination cursor. 
Error Codes 
● FORBIDDEN 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 29 of 38 
GET  /admin/verification-queue/overdue 
Roles Permitted: Admin, Super Admin 
Requirement Ref: BRD FR-21 | TRD Item 13 
Lists doctor-verification queue items exceeding the 12-hour median SLA target for Admin-panel escalation. 
Response Body (200/201) 
Field Type Description 
data array List of {prescription_id, queued_at, hours_overdue, assigned_doctor_id}. 
Error Codes 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 30 of 38 
3.9 User Admin Panel 
Implements BRD FR-23 to FR-25 and TRD Section 4.8. `user_admin` is explicitly denied access to financial -configuration, 
inventory, and order-routing endpoints at the API-authorization layer (TRD Item 29). 
GET  /user-admin/doctors/pending-kyc 
Roles Permitted: User Admin, Super Admin 
Requirement Ref: BRD FR-23 | TRD Item 27 
Lists doctor accounts in `pending` status awaiting medical license/registration KYC verification.  
Response Body (200/201) 
Field Type Description 
data array List of {user_id, full_name, license_number, submitted_at}. 
Error Codes 
● FORBIDDEN 
POST  /user-admin/doctors/{doctor_id}/verify-license 
Roles Permitted: User Admin, Super Admin 
Requirement Ref: BRD FR-23 | TRD Item 27 
Cross-checks a doctor's license/registration number and transitions the account from `pending` to `active` on approval, or 
records a rejection reason. 
Request Body 
Field Type Required Description 
decision string (enum) Yes approve | reject. 
reason string Conditional Required when decision = reject. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Doctor account identifier. 
status string active | pending (unchanged, rejected). 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● REASON_REQUIRED_FOR_REJECTION 
● FORBIDDEN 
POST  /user-admin/accounts/{user_id}/suspend 
Roles Permitted: User Admin, Super Admin 
Requirement Ref: BRD FR-24 | TRD Item 28 
Suspends a patient, doctor, or pharmacy-staff account with a mandatory reason code. Denied at the auth layer immediately 
— token issuance is blocked and existing tokens are checked against a live status flag, not just expiry (TRD Item 28, Section 
7.1). 
Request Body 
Field Type Required Description 
reason_code string Yes Mandatory reason code, persisted to the audit log. 
Response Body (200/201) 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 31 of 38 
Field Type Description 
user_id string (UUID) Account identifier. 
status string suspended. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● REASON_CODE_REQUIRED 
● FORBIDDEN — target is an Admin/Super Admin account 
POST  /user-admin/accounts/{user_id}/reinstate 
Roles Permitted: User Admin, Super Admin 
Requirement Ref: BRD FR-24 
Reinstates a previously suspended account with a mandatory reason code.  
Request Body 
Field Type Required Description 
reason_code string Yes Mandatory reason code, persisted to the audit log. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Account identifier. 
status string active. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● REASON_CODE_REQUIRED 
● FORBIDDEN 
PATCH  /user-admin/accounts/{user_id} 
Roles Permitted: User Admin, Super Admin 
Requirement Ref: BRD FR-24 
Edits account profile fields or reassigns a user's role on behalf of the user (e.g., correcting a registration error).  
Request Body 
Field Type Required Description 
full_name string No Corrected name. 
role string (enum) No Reassigned role, if applicable. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Account identifier. 
updated_fields array List of changed fields. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 32 of 38 
3.10 Super Admin Panel 
Implements BRD FR-26 to FR-29 and TRD Section 4.9. Only the `super_admin` role may reach these endpoints; enforced via a 
dedicated, separately-audited endpoint group (TRD Item 30). 
POST  /super-admin/admins 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-26 | TRD Item 30 
Creates a new Admin or User Admin account and assigns a granular permission set.  
Request Body 
Field Type Required Description 
full_name string Yes Account holder's name. 
email string Yes Login email. 
role string (enum) Yes admin | user_admin. 
permissions array Yes Granular permission set (e.g., ["partner_onboarding", 
"dispute_resolution"]). 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) New account identifier. 
role string Assigned role. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● EMAIL_ALREADY_EXISTS 
● FORBIDDEN 
PATCH  /super-admin/admins/{admin_id}/permissions 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-26 
Updates the granular permission set assigned to an Admin or User Admin account.  
Request Body 
Field Type Required Description 
permissions array Yes Full replacement permission set. 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Account identifier. 
permissions array Updated permission set. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● FORBIDDEN 
DELETE  /super-admin/admins/{admin_id} 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-26 
Revokes an Admin or User Admin account. 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 33 of 38 
Response Body (200/201) 
Field Type Description 
user_id string (UUID) Revoked account identifier. 
status string revoked. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● USER_NOT_FOUND 
● FORBIDDEN 
GET  /super-admin/settings 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-27 | TRD Item 31 
Returns current platform-wide settings. Credential values (e.g., payment gateway keys) are never returned in plaintext; 
masked references are returned instead. 
Response Body (200/201) 
Field Type Description 
commission_rate_pct number Current platform commission rate. 
payment_gateway_credential_ref string Masked reference to the stored credential. 
security_policies object Password/session/MFA policy configuration. 
Error Codes 
● FORBIDDEN 
PATCH  /super-admin/settings 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-27 | TRD Item 31 
Updates platform-wide settings (commission rates, payment gateway credentials, security policies). Changes are versioned 
in a protected configuration store with change-history tracking. 
Request Body 
Field Type Required Description 
commission_rate_pct number No Updated commission rate. 
payment_gateway_credential string No New credential value (write-only; never echoed back). 
security_policies object No Updated policy configuration. 
Response Body (200/201) 
Field Type Description 
updated_fields array List of changed setting keys. 
config_version integer New configuration version number. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● VALIDATION_ERROR 
● FORBIDDEN 
POST  /super-admin/compliance-overrides 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-28 | TRD Item 32 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 34 of 38 
Overrides a regulated-order compliance block (e.g., an edge-case Schedule H order) with mandatory justification text. 
Logged with full context and surfaced in a dedicated override report for audit.  
Request Body 
Field Type Required Description 
order_id string (UUID) Yes Order whose compliance block is being overridden. 
justification string Yes Mandatory justification text. 
Response Body (200/201) 
Field Type Description 
override_id string (UUID) New override record identifier. 
order_id string (UUID) Affected order. 
audit_log_id string (UUID) Reference to the audit entry. 
Error Codes 
● ORDER_NOT_FOUND 
● JUSTIFICATION_REQUIRED 
● FORBIDDEN 
GET  /super-admin/audit-logs 
Roles Permitted: Super Admin 
Requirement Ref: BRD FR-29 | TRD Item 33, Section 7.4 
Queries the append-only audit log store across all three admin tiers plus doctor -verification and payment-refund events, for 
regulatory reporting. 
Query Parameters 
Field Type Required Description 
actor_role string No Filter by actor role. 
action_type string No Filter by action type. 
date_from string (ISO 
8601) No Range start. 
date_to string (ISO 
8601) No Range end. 
limit integer No Page size. 
cursor string No Pagination cursor. 
Response Body (200/201) 
Field Type Description 
data array List of {actor_id, actor_role, action_type, target_entity, timestamp, 
justification}. 
next_cursor string | null Pagination cursor. 
Error Codes 
● FORBIDDEN 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 35 of 38 
3.11 Webhooks 
Implements TRD Section 4.5, Item 21 and Section 6.1. All webhook -receiving endpoints verify provider signatures before 
processing and are idempotent, keyed by the provider's event ID. 
POST  /webhooks/razorpay 
Roles Permitted: System (Razorpay server-to-server, signature-verified) 
Requirement Ref: BRD FR-16 to FR-18 | TRD Item 21 
Receives asynchronous payment/refund lifecycle events from Razorpay (payment.captured, payment.failed, 
refund.processed, etc.). Signature is verified before any processing; handler responds within Razorpay's required timeout 
and offloads reconciliation to a background job. 
Special Headers: X-Razorpay-Signature: required 
Request Body 
Field Type Required Description 
event string Yes Razorpay event type. 
payload object Yes Event-specific payload as defined by Razorpay's webhook 
schema. 
Response Body (200/201) 
Field Type Description 
received boolean Always true once the signature is verified and the event is queued. 
Error Codes 
● SIGNATURE_VERIFICATION_FAILED — request rejected, not processed 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 36 of 38 
4. Consolidated Error Code Reference 
The table below consolidates the error_code values referenced throughout Section 3, grouped by module, for quick lookup 
during client-side error handling. 
4.1 General 
Error Code HTTP Meaning 
VALIDATION_ERROR 400 One or more request fields are missing or malformed; see field_errors. 
UNAUTHORIZED 401 Missing, invalid, or expired access token. 
FORBIDDEN 403 Authenticated, but the caller's role lacks permission for this endpoint or resource. 
RATE_LIMITED 429 Too many requests in the current window; retry after the interval in the Retry-After 
header. 
IDEMPOTENCY_KEY_REQUIRED 400 A state-mutating financial endpoint was called without an Idempotency-Key header. 
4.2 Identity & Access 
Error Code HTTP Meaning 
EMAIL_ALREADY_EXISTS 409 Email is already registered to another account. 
PHONE_ALREADY_EXISTS 409 Phone number is already registered to another account. 
LICENSE_FORMAT_INVALID 400 Supplied medical license/registration number fails format validation. 
OTP_INVALID_OR_EXPIRED 400 OTP code does not match or the validity window has elapsed. 
INVALID_CREDENTIALS 401 Email/password combination did not match. 
ACCOUNT_SUSPENDED 403 Account is suspended; token issuance/refresh is blocked. 
ACCOUNT_PENDING_VERIFICATION 403 Doctor/pharmacy account is awaiting User Admin KYC verification. 
REFRESH_TOKEN_INVALID_OR_EXPIRED 401 Refresh token could not be validated. 
4.3 Prescription, Report & Verification 
Error Code HTTP Meaning 
FILE_TOO_LARGE 413 Upload exceeds the configured maximum file size. 
UNSUPPORTED_FILE_TYPE 400 File is not JPG, PNG, or PDF. 
MALWARE_SCAN_FAILED 422 File failed the pre-persistence virus/malware scan. 
PRESCRIPTION_NOT_FOUND 404 No prescription exists with the supplied ID, or caller lacks access. 
REPORT_NOT_FOUND 404 No report exists with the supplied ID, or caller lacks access. 
ALREADY_VERIFIED 409 Prescription has already been approved/rejected. 
REASON_REQUIRED 400 A mandatory reason/justification field was omitted. 
4.4 Catalog, Orders & Payments 
Error Code HTTP Meaning 
MEDICINE_NOT_FOUND 404 No catalog item exists with the supplied ID. 
PRESCRIPTION_REQUIRED 422 A Schedule H/H1/X item was added without a linked prescription. 
PRESCRIPTION_NOT_VERIFIED 422 Checkout blocked: a regulated line item lacks a doctor_verified prescription reference. 
OUT_OF_STOCK 409 Requested quantity is not available across owned or partner stock. 
CART_EMPTY 422 Order creation was attempted against an empty cart. 
ORDER_ALREADY_DISPATCHED 409 Cancellation was attempted after the order left the dispatch stage. 
AMOUNT_MISMATCH 422 Payment amount does not match the platform order's expected amount. 
SIGNATURE_VERIFICATION_FAILED 401 Razorpay payment or webhook signature could not be verified. 
REFUND_AMOUNT_EXCEEDS_CAPTURED 422 Requested refund is greater than the amount captured. 
4.5 Chat Assistant 
Error Code HTTP Meaning 
CONSENT_REQUIRED 403 Chat session was started before logging consent was recorded. 
SESSION_NOT_FOUND 404 No chat session exists with the supplied ID. 
SESSION_EXPIRED 410 Chat session has exceeded its inactivity window. 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 37 of 38 
5. Rate Limiting 
Default rate limits (subject to tuning during load testing) apply per authenticated user, keyed by user_id, or per IP for 
public/unauthenticated endpoints: 
● Public/auth endpoints (login, OTP request): 10 requests/minute per phone or IP. 
● Authenticated read endpoints (catalog, orders, notifications): 120 requests/minute per user. 
● Authenticated write endpoints (uploads, orders, payments): 30 requests/minute per user. 
● Admin/Super Admin endpoints: 60 requests/minute per user, with additional anomaly-based throttling on audit-log and 
settings endpoints. 
Rate-limited responses return HTTP 429 with a Retry-After header and error_code = RATE_LIMITED. 
 

API Collection Document v1.0 — Draft I.P. & M.D Platform 
I.P. & M.D Platform — API Collection Document  |  Page 38 of 38 
6. Glossary 
 
Field Type Description 
BFF N/A Backend-for-Frontend — an API layer tailored to client (web/mobile) needs, sitting in front 
of core services. 
RBAC N/A Role-Based Access Control — permissioning model based on assigned user roles. 
RAG N/A Retrieval-Augmented Generation — grounding LLM responses in retrieved reference 
content. 
JWT N/A JSON Web Token — signed token format used for access/refresh tokens. 
Idempotency Key N/A A client-supplied unique key ensuring a retried request is not processed twice. 
Schedule H/H1/X N/A Categories of drugs under Indian law requiring a valid, verified prescription to dispense. 
SKU N/A Stock Keeping Unit — a unique identifier for a sellable medicine/product. 
DPDP Act N/A Digital Personal Data Protection Act (India, 2023). 
WORM N/A Write Once, Read Many — storage model preventing modification/deletion after write, 
used for audit logs. 
This API Collection Document is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0) and 
TRD_IPMD_Platform_v1 (v1.0). Field-level schema and constraint definitions are maintained in the companion Database Schema 
document (Doc 3). Any scope changes identified during API design should be reflected back into the BRD/TRD first, then propagated to this 
document and the remaining companions (Database Schema, App Flow, UI/UX, Integration Plan). 


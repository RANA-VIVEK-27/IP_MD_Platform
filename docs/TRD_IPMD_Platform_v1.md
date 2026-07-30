TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 1 of 21 
I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
TECHNICAL REQUIREMENT DOCUMENT (TRD) 
Version 1.0 | Draft for Review 
Prepared: July 2026 
Document 2 of 7 — Project Documentation Suite 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 2 of 21 
Document Control 
Field Detail 
Document Title Technical Requirement Document (TRD) — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Technical & Stakeholder Review 
Prepared Date July 2026 
Derived From BRD_IPMD_Platform_v1 (Business Requirement Document, v1.0)  
Related Documents BRD, API Collection, Database Schema, App Flow, UI/UX, Integration Plan  
 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD v1.0 Technical/Engineering 
Team 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 3 of 21 
1. Introduction 
1.1 Purpose 
This Technical Requirement Document (TRD) translates the Business Requirement Document 
(BRD_IPMD_Platform_v1, v1.0) into a concrete technical blueprint for Version 1 (V1) of the I.P. & M.D 
Platform. It defines the system architecture, technology stack, module-level technical requirements, 
integration specifications, security architecture, and non-functional engineering targets required to build 
the platform for the India launch. 
This document is intended for the engineering, DevOps, QA, and security teams responsible for designing 
and building the platform, and for technical stakeholders performing feasibility and review sign-off. 
1.2 Scope of This Document 
This TRD covers architecture and engineering-level requirements only. It intentionally does not restate 
full functional/business scope (see BRD) or provide field-level schema/API contracts, which are covered in 
the companion Database Schema and API Collection documents in this suite. Where relevant, this 
document references the specific BRD functional requirement numbers (e.g., FR-5.1.3) it addresses. 
1.3 Reference Documents 
Document Purpose 
BRD_IPMD_Platform_v1 Business goals, scope, roles, functional requirements (source document for 
this TRD) 
Database Schema (Doc 3) Entity-relationship model, table definitions, constraints 
API Collection (Doc 4) Endpoint-level contracts, request/response schemas, auth headers 
App Flow (Doc 5) Screen-by-screen and state-transition flow for web/mobile 
UI/UX (Doc 6) Wireframes, design system, accessibility annotations 
Integration Plan (Doc 7) Step-by-step third-party integration and credential/config plan 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 4 of 21 
2. System Architecture Overview 
2.1 Architectural Approach 
V1 is built as a modular, service-oriented monolith on FastAPI rather than a full microservices mesh. 
Business capabilities (Identity & Access, Prescription/Report, Catalog & Order, Payments & Notification) 
are implemented as independently deployable, well-isolated modules behind a shared API Gateway/BFF 
layer, each owning its own data access boundary. This balances V1 delivery speed against the BRD's 
Objective 5 (architecture must support scaling to multi-region by V2) — module boundaries are drawn so 
any module can be extracted into a standalone microservice in Phase 2/3 without a data-model rewrite. 
The AI Comprehension Pipeline (OCR + Medical NLP) and the AI Health Chat Assistant are architected as 
separate, independently scalable services from day one, since they have different scaling profiles (bursty, 
compute-heavy, and often GPU-bound) compared to the transactional core. 
2.2 High-Level Architecture Diagram 
 
Figure 1: Layered architecture — client layer, API gateway/BFF, core application services, AI/ML layer, data layer, and 
underlying cloud infrastructure. 
2.3 Architecture Layers 
Layer Responsibility Key Components 
Client Layer Patient, doctor, pharmacy-staff, and admin-
facing UI 
React + Next.js (web), Flutter 
(iOS/Android) 
API Gateway / BFF AuthN/AuthZ, request routing, rate limiting, 
request/response shaping per client 
FastAPI gateway service, JWT/OAuth2 
validation, RBAC middleware 


TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 5 of 21 
Layer Responsibility Key Components 
Core Application Services Business logic for identity, prescriptions, 
catalog/orders, payments, notifications 
FastAPI service modules, background 
workers (Celery/RQ) 
AI/ML Layer OCR, medical NLP extraction, confidence 
scoring, LLM-based chat assistant 
OCR engine, NLP/NER models, 
LangChain orchestration, LLM 
provider 
Data Layer Transactional storage, file storage, caching, 
vector storage for RAG 
PostgreSQL, S3-compatible object 
storage, Redis, vector store 
(pgvector) 
Infrastructure Layer Hosting, containerization, orchestration, 
observability, audit trail 
Docker, Kubernetes, India cloud 
region, WORM audit log store 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 6 of 21 
3. Technology Stack 
The stack below is carried forward from the BRD's platform-wide requirements (Section 3.1) and 
expanded with the supporting technical choices needed to meet the NFRs in BRD Section 6. 
3.1 Client Applications 
Component Technology Notes 
Web App React 18 + Next.js (App Router) 
SSR/ISR for patient-facing pages; SPA 
behavior for authenticated 
dashboards 
Mobile App Flutter (single codebase, iOS + Android) Shared design system with web via a 
common component/token spec 
State Management React Query / TanStack Query (web), 
Riverpod (Flutter) 
Server-state caching, optimistic 
updates for order/status flows 
Design System Shared token-based theme (colors, spacing, 
typography) WCAG AA target per BRD Section 6 
3.2 Backend & Services 
Component Technology Notes 
API Framework FastAPI (Python 3.12+) Async-first; OpenAPI schema auto-
generated for API Collection doc 
Background Jobs Celery or RQ + Redis broker OCR/NLP processing, notification 
dispatch, report flag jobs 
Auth OAuth2 / JWT (access + refresh tokens) Role claims embedded for RBAC 
across 7 role types 
Realtime/Status Updates WebSockets or polling via short-TTL cache Used for AI extraction status (target 
15–30s turnaround) 
3.3 AI / ML Layer 
Component Technology Options Notes 
OCR Engine 
Managed OCR API (e.g., cloud 
vision/document OCR) with Tesseract as 
fallback 
Must handle handwritten + printed 
prescriptions 
Medical NLP 
Fine-tuned/medical-domain NER model 
(spaCy/transformer-based) for entity 
extraction 
Extracts medicine, strength, dosage, 
frequency, duration, test values 
AI Chat Assistant LangChain orchestration + hosted LLM 
provider 
Scoped prompts, RAG over 
medicine/FAQ corpus, non-diagnostic 
guardrails 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 7 of 21 
Component Technology Options Notes 
Confidence Scoring Model-native confidence + custom rule-
based thresholds 
Drives doctor/admin review routing 
per BRD FR-5.1.4 
3.4 Data & Storage 
Component Technology Notes 
Primary Database PostgreSQL (managed, e.g., RDS/Cloud SQL 
equivalent, India region) 
Transactional data: users, orders, 
catalog, verification records 
File/Object Storage S3-compatible object storage Prescription/report images & PDFs, 
encrypted at rest 
Cache & Queue Redis Session cache, job queue broker, 
rate-limit counters 
Vector Store pgvector (PostgreSQL extension) or 
managed vector DB 
Embeddings for AI chat assistant RAG 
corpus 
Audit Log Store 
Append-only/WORM-configured storage or 
dedicated audit table with no 
update/delete grants 
Immutable audit trail per BRD FR-
5.9.29 
3.5 Third-Party Integrations 
Integration Provider Purpose 
Payments Razorpay Cards, UPI, netbanking, wallets; 
split/partial capture; refunds 
Push Notifications Firebase Cloud Messaging Order/status/refill/report-flag push 
alerts 
Email Transactional email provider (e.g., 
SES/SendGrid-class) Order and account notifications 
SMS SMS gateway with India DLT compliance OTP login, order/dispatch alerts 
3.6 DevOps & Infrastructure 
Component Technology Notes 
Containerization Docker Every service ships as an image 
Orchestration Kubernetes Enables independent scaling of AI/ML 
workloads vs. core API 
CI/CD GitHub Actions (or equivalent) Automated build, test, image publish, 
deploy 
IaC Terraform Reproducible environment 
provisioning (dev/staging/prod) 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 8 of 21 
Component Technology Notes 
Observability Prometheus + Grafana (metrics), 
ELK/OpenSearch (logs), Sentry (errors) 
Central dashboards for uptime/perf 
NFRs 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 9 of 21 
4. Module-Wise Technical Requirements 
This section maps each BRD functional module (Section 5 of the BRD) to its technical implementation 
approach. Requirement IDs (e.g., FR-1) correspond to the numbered list in BRD Section 5. 
4.1 Prescription & Report Intake (BRD FR-1 to FR-5) 
1. Upload service accepts JPG/PNG/PDF via signed, size-limited multipart upload; max size 
configurable via platform settings (Super Admin panel), default suggested 20 MB per file. 
2. Uploaded files are virus/malware-scanned before being persisted to object storage; original file 
retained immutably, referenced by a document ID. 
3. On upload, an async job is queued (Celery/RQ) to run OCR, then pass raw text to the Medical NLP 
model for structured extraction (medicine name, strength, dosage, frequency, duration, prescribing 
doctor, date; for reports: test name, value, unit, reference range, flag). 
4. Each extracted field carries a confidence score (0–1). Fields below a configurable threshold (default 
suggested 0.85) are flagged `needs_review` and routed to the doctor-verification queue; fields 
at/above threshold are marked `auto_accepted` but remain editable by a reviewing doctor. 
5. A hard system rule (enforced at the order-service layer, not just UI) blocks dispensing of Schedule 
H/H1/X-tagged catalog SKUs unless a linked prescription record has `verification_status = 
doctor_verified`. 
6. Target processing latency: 15–30 seconds end-to-end (BRD NFR, Section 6) — achieved via a 
dedicated, autoscaled worker pool for OCR/NLP jobs, decoupled from the main API 
request/response cycle; client polls or subscribes via WebSocket for a status callback. 
4.2 AI Health Chat Assistant (BRD FR-6 to FR-8) 
7. Chat assistant built on LangChain orchestration calling a hosted LLM provider, with a system prompt 
that scopes responses to general health information, medicine information, and platform navigation 
only. 
8. A guardrail layer intercepts diagnostic-sounding or emergency-indicating queries and forces a fixed 
disclaimer + doctor/emergency-resource redirect response, rather than passing them through to 
free-form generation. 
9. Retrieval-Augmented Generation (RAG) over a curated medicine/FAQ knowledge base (embedded 
into the vector store) improves factual grounding and reduces hallucinated medical claims. 
10. Chat logs are stored only with explicit user consent captured at first use; logs are linked to a 
consent record and are purgeable per DPDP Act data-retention configuration (see Section 9). 
4.3 Doctor Verification Workflow (BRD FR-9 to FR-11) 
11. Verification queue service assigns each `needs_review` prescription to the linked/assigned 
doctor if one exists, otherwise to an on-call verifying-doctor pool using a round-robin or load-based 
assignment strategy. 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 10 of 21 
12. Doctor review UI (web) supports approve-as-is, field-level edit, or reject-with-reason actions; 
every action writes an immutable, timestamped entry to the audit log store (append-only, no 
update/delete permission at the DB-role level). 
13. SLA tracking: each queue item carries a `queued_at` timestamp; a scheduled job flags items 
exceeding the 12-hour median SLA target (BRD KPI) for Admin-panel escalation. 
4.4 Medicine Catalog & Ordering (BRD FR-12 to FR-15) 
14. Catalog service maintains a unified product table keyed by a standard medicine identifier, with 
owned-inventory and partner-pharmacy SKUs linked as separate stock records against the same 
catalog item (de-duplication at the identifier level, not the listing level). 
15. Prescription-line-item-to-SKU matching uses a combination of exact identifier match, generic-
equivalent mapping table, and confidence-scored fuzzy match for OCR-derived free text; low-
confidence matches surface as suggestions, not auto-added cart items. 
16. Order routing engine selects fulfillment source per line item using a weighted decision on stock 
availability, price, and delivery-SLA distance/zone, falling back to split-fulfillment across owned and 
partner sources where required. 
17. Checkout service enforces a hard compliance gate: any cart containing a Schedule H/H1/X SKU 
cannot proceed to payment capture without a `doctor_verified` prescription reference attached to 
that line item. 
4.5 Payments (BRD FR-16 to FR-18) 
18. Razorpay integration supports card, UPI, netbanking, and wallet methods via Razorpay 
Checkout/Orders API; server-side order creation precedes client payment initiation (never trust 
client-only payment confirmation). 
19. Split-fulfillment orders are modeled as one payment intent with multiple linked fulfillment 
records, or multiple linked payment captures where partner-pharmacy settlement requires separate 
transfer records (finalized in Integration Plan doc). 
20. Refunds for cancelled/returned/out-of-stock items are processed via Razorpay's refund API and 
reconciled nightly against internal order-ledger records; discrepancies raise an Admin-panel alert. 
21. All payment webhooks are signature-verified before processing; webhook handlers are 
idempotent (keyed by Razorpay event ID) to safely handle provider retries. 
4.6 Notifications (BRD FR-19) 
22. Notification service consumes domain events (order confirmed, verification result, dispatch, 
delivery, refill reminder, abnormal report flag) from an internal event/queue bus and fans out to 
Firebase (push), email, and SMS channels based on user channel preferences. 
23. Delivery is best-effort with retry/backoff; failed sends are logged for Admin visibility but do not 
block the underlying business transaction. 
4.7 Admin Panel — Operations (BRD FR-20 to FR-22) 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 11 of 21 
24. Operations dashboard is a role-scoped view within the same web app, gated by an `admin` role 
claim; reads aggregate data via dedicated reporting queries/materialized views to avoid load on 
transactional tables. 
25. Order-routing and dispute-resolution actions are exposed via dedicated endpoints requiring 
`admin` role; these endpoints are explicitly excluded from the permission set for `user_admin` role 
at the API-authorization layer, not just hidden in the UI. 
26. RBAC enforcement happens server-side (API Gateway/BFF layer) via role-claim checks on every 
request — UI-only hiding of controls is never treated as a security boundary. 
4.8 User Admin Panel (BRD FR-23 to FR-25) 
27. Doctor KYC verification workflow captures medical license/registration number, cross-checked 
(manually or via a future registry API integration) before the doctor account transitions from 
`pending` to `active` status. 
28. Account suspend/reinstate/edit actions require a mandatory reason code, persisted to the audit 
log; suspended accounts are denied at the auth layer (token issuance blocked), not just flagged in 
the UI. 
29. `user_admin` role is explicitly denied access to financial-configuration, inventory, and order-
routing endpoints at the API-authorization layer. 
4.9 Super Admin Panel (BRD FR-26 to FR-29) 
30. Only `super_admin` role can create/edit/revoke `admin` and `user_admin` accounts and assign 
granular permission sets; this is enforced via a dedicated, separately-audited endpoint group. 
31. Platform-wide settings (commission rates, payment gateway credentials, security policies) are 
stored in a protected configuration store with change-history versioning; credential values are never 
returned in plaintext via any API response. 
32. Compliance-override actions (e.g., overriding a regulated-order block) require mandatory 
justification text, are logged with full context (user, timestamp, order ID, reason), and are surfaced 
in a dedicated override report for audit. 
33. Audit log store is append-only (no UPDATE/DELETE database grants for any application role) and 
covers actions across all three admin tiers plus doctor-verification and payment-refund events. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 12 of 21 
5. Data Architecture (High-Level) 
Full entity-relationship definitions, field-level constraints, and indexing strategy are maintained in the 
companion Database Schema document (Doc 3 of this suite). This section defines the high-level data 
domains and storage strategy that document must implement against. 
5.1 Core Data Domains 
Domain Representative Entities Storage 
Identity & Access User, Role, Permission, DoctorLicense, Session PostgreSQL 
Prescription & Reports PrescriptionUpload, ExtractedField, 
VerificationAction, ReportFlag 
PostgreSQL (metadata) + Object 
Storage (files) 
Catalog & Inventory MedicineCatalogItem, OwnedInventoryStock, 
PartnerPharmacy, PartnerStock PostgreSQL 
Orders & Fulfillment Order, OrderLineItem, FulfillmentRecord, 
RoutingDecision PostgreSQL 
Payments PaymentIntent, PaymentCapture, Refund, 
PayoutLedger PostgreSQL 
Notifications NotificationEvent, DeliveryLog, 
UserChannelPreference PostgreSQL + Redis (queue) 
AI Chat ChatSession, ChatMessage, ConsentRecord, 
KnowledgeEmbedding PostgreSQL + Vector Store 
Audit & Compliance AuditLogEntry, ComplianceOverride, ConsentLog Append-only audit store 
5.2 Data Storage Strategy 
• Transactional data lives in PostgreSQL with row-level security or application-layer scoping for multi-
tenant partner-pharmacy data isolation. 
• Uploaded prescriptions/reports are stored in object storage, encrypted at rest (AES-256 or provider-
equivalent), referenced from PostgreSQL by document ID — never stored as BLOBs in the relational 
database. 
• Redis is used for short-lived state only (sessions, job queues, rate-limit counters, extraction-status 
cache) — it is never the system of record. 
• Vector embeddings for the AI chat assistant's RAG corpus are kept separate from transactional PII-
bearing tables to simplify access-control and retention policies. 
• Data localization: given DPDP Act considerations (BRD Section 7), primary data stores are hosted in 
an India cloud region; cross-region replication (for future multi-region expansion) is deferred to 
Phase 3 and will require a jurisdiction-specific review before enablement. 
5.3 Data Retention & Deletion 
• Retention periods per data domain (chat logs, uploaded documents, audit logs) are configurable by 
Super Admin, defaulting to the minimum period needed for regulatory/audit purposes. 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 13 of 21 
• Audit log entries are exempt from user-initiated deletion requests (legal/compliance requirement) 
but are subject to access restriction, not erasure. 
• User-initiated account deletion requests trigger a data-minimization workflow: PII is 
anonymized/pseudonymized where retention is legally required (e.g., financial/audit trail), and fully 
deleted where not. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 14 of 21 
6. API Design Principles 
Full endpoint-level contracts are defined in the API Collection document (Doc 4). This section defines the 
conventions that document must follow. 
6.1 Conventions 
• RESTful JSON APIs served via FastAPI, versioned via URL prefix (e.g., /api/v1/...); breaking changes 
require a new version prefix, not in-place mutation of an existing contract. 
• Authentication via short-lived JWT access tokens plus refresh tokens; OTP-based and OAuth login 
flows issue the same token pair post-authentication. 
• Authorization via role claims embedded in the JWT, validated at the API Gateway/BFF layer on every 
request, with per-endpoint permission checks (not just role-name checks) to support the granular 
permission model introduced by Super Admin (BRD FR-26). 
• Idempotency keys required on all state-mutating financial endpoints (order creation, payment 
capture, refund) to safely handle client retries. 
• Pagination via cursor-based pagination for list endpoints expected to grow large (orders, catalog, 
audit logs). 
• All webhook-receiving endpoints (Razorpay) verify provider signatures and respond within provider-
required timeouts, offloading heavy processing to background jobs. 
6.2 Error Handling 
• Consistent error envelope: machine-readable `error_code`, human-readable `message`, and 
optional `field_errors` for validation failures. 
• Compliance-block errors (e.g., checkout blocked on unverified Schedule H item) return a distinct, 
explicit error code so clients can render the correct guidance rather than a generic failure. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 15 of 21 
7. Security Architecture 
7.1 Authentication & Role-Based Access Control 
The platform supports seven distinct role types (Patient, Doctor, Pharmacy Staff — Owned, Partner 
Pharmacy, Admin, User Admin, Super Admin), each with a distinct permission set as defined in BRD 
Section 4.1. RBAC is implemented as a first-class concern, not an afterthought: 
• Role and permission checks are enforced server-side at the API Gateway/BFF layer on every request 
— never assumed from client-side UI state. 
• The three admin tiers are modeled as a strict permission hierarchy (Super Admin ⊃ Admin, User 
Admin operate on disjoint permission sets) matching BRD Section 4.1's tier-scope table exactly; 
automated tests assert that Admin and User Admin tokens are rejected on each other's restricted 
endpoints. 
• Session/token revocation is immediate on account suspension — suspended users cannot use a still-
valid access token (checked against a live status flag, not just token expiry). 
7.2 Data Protection 
• All data in transit is encrypted via TLS 1.2+; internal service-to-service traffic within the cluster is 
also encrypted (mTLS where the orchestration platform supports it). 
• All data at rest — database, object storage, backups — is encrypted using provider-managed or 
customer-managed keys. 
• Health data fields (prescription contents, report values, chat messages) are treated as sensitive-
category data with stricter field-level access logging than generic account data. 
• PII and health data are never included in application logs; structured logging redacts known 
sensitive field names at the logging-library level. 
7.3 Regulatory & Compliance Controls (India Launch) 
Directly implementing the BRD's Section 7 compliance considerations: 
34. Schedule H/H1/X dispensing gate: enforced at the order-service layer as a non-bypassable check 
(verified prescription reference required), independent of and in addition to any UI-level warning. 
35. DPDP Act alignment: consent capture at point of data collection (chat logs, health data upload), 
purpose-limitation tagging on stored data, and configurable retention/deletion workflows (Section 
5.3). 
36. AI-output labeling: every AI-generated interpretation (extraction result or chat response) is 
returned with a structured `is_ai_generated: true` / disclaimer flag so clients render the 
informational/non-diagnostic notice consistently — this is a contract-level guarantee, not left to 
per-screen UI copy. 
37. Telemedicine-adjacent doctor actions (verification/endorsement) are logged with doctor 
identity, license reference, and timestamp to support alignment with Telemedicine Practice 
Guidelines. 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 16 of 21 
38. Data localization: primary data stores hosted in an India cloud region; any future cross-border 
data flow (Phase 3 international expansion) requires a jurisdiction-specific technical and legal review 
before enablement. 
7.4 Audit Logging 
• A dedicated, append-only audit log store captures: every doctor verification action, every admin-tier 
account action, every compliance override, and every regulated-medicine order transition. 
• Audit entries are structured (actor ID, actor role, action type, target entity, timestamp, justification 
where applicable) and are queryable by Super Admin for regulatory reporting without needing to 
reconstruct history from transactional tables. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 17 of 21 
8. Technical Non-Functional Requirements 
These translate the business-level NFRs in BRD Section 6 into concrete engineering targets and 
mechanisms. 
BRD NFR Technical Target / Mechanism 
Availability ≥ 99.5% (ordering & 
payment paths) 
Multi-replica deployment behind a load balancer; health-check-based 
auto-restart; database in a managed HA configuration with automated 
failover; deploy via rolling updates to avoid downtime windows. 
Data Privacy — encryption at rest & 
in transit; role-restricted access 
TLS everywhere; provider-managed encryption at rest; RBAC enforced at 
API layer (Section 7.1); field-level access logging for health data. 
Performance — AI extraction in 15–
30s 
Dedicated autoscaled worker pool for OCR/NLP jobs, decoupled from 
request/response cycle; status polling/WebSocket callback; horizontal 
scaling triggered on queue depth. 
Auditability — verifications & 
regulated dispensing traceable 
Append-only audit log store (Section 7.4) with structured, queryable 
entries covering every relevant action. 
Scalability — India-only to multi-
region by V2 
Containerized, stateless application services; module boundaries drawn for 
future service extraction; data layer chosen to support read-replica and 
regional-partitioning strategies later. 
Accessibility — WCAG AA target 
Design-system components built to WCAG AA contrast/focus/semantic -
markup standards; automated accessibility linting in CI for the web app; 
Flutter semantic labels audited for mobile. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 18 of 21 
9. DevOps, Infrastructure & Deployment 
9.1 Environments 
Environment Purpose 
Development Feature development and integration testing; synthetic/mock data only  
Staging Pre-production validation; mirrors production configuration at smaller scale; 
sandbox credentials for Razorpay/Firebase/SMS 
Production Live environment; India cloud region; full monitoring and backup policies active  
9.2 CI/CD 
• Every merge to main triggers automated linting, unit tests, and container image build. 
• Staging deploys are automatic on merge; production deploys are gated behind manual approval 
plus a passing integration-test suite. 
• Database migrations are versioned and applied via a migration tool as part of the deploy pipeline, 
with a documented rollback path per migration. 
9.3 Infrastructure as Code 
• All cloud resources (compute, networking, database, storage buckets, IAM roles) are defined via 
Terraform so environments are reproducible and reviewable via pull request. 
9.4 Monitoring, Logging & Observability 
• Metrics: request latency, error rate, queue depth, AI-pipeline processing time, and payment success 
rate tracked via Prometheus and visualized in Grafana dashboards mapped directly to the BRD KPIs 
(Section 9 of BRD). 
• Logs: centralized structured logging (ELK/OpenSearch-class stack) with PII/health-data redaction 
applied before indexing. 
• Error Tracking: application exceptions captured via an error-tracking tool (e.g., Sentry-class) with 
alerting to on-call engineering. 
• Alerting thresholds are set against the BRD's own success metrics (e.g., alert if doctor-verification 
queue median exceeds 12 hours, or payment success rate drops below 98%) so operational alerts 
are directly traceable to business KPIs. 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 19 of 21 
10. Technical Risks & Mitigations 
Complementary to the business-level risks in BRD Section 10, from an engineering perspective: 
Risk Impact Technical Mitigation 
OCR/NLP misextraction on 
handwritten prescriptions High 
Confidence-based routing to mandatory doctor review; 
continuous model evaluation against a labeled handwriting 
benchmark set, tracked separately per BRD KPI 
AI/ML workload spikes 
degrading core transactional 
performance 
Medium AI/ML services isolated on separate autoscaled node pools 
from core API/order services 
Compliance gate bypass 
(regulated medicine dispensed 
without verification) 
High 
Gate enforced at the service layer with automated tests 
asserting the block cannot be bypassed via direct API calls, not 
only via UI 
Payment/refund inconsistency 
with Razorpay Medium 
Idempotent webhook handling keyed by provider event ID; 
nightly automated reconciliation job with Admin-panel 
discrepancy alerts 
Partner pharmacy data 
inconsistency (stock/catalog 
feeds) 
Medium Schema validation on partner feed ingestion; stale-feed 
detection with automatic temporary de-listing 
Audit log tampering or gaps High 
Database-role-level restriction (no UPDATE/DELETE grants on 
audit tables) plus periodic integrity checks (e.g., hash chaining) 
considered for hardening 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 20 of 21 
11. Technical Assumptions & Dependencies 
11.1 Assumptions 
• A managed cloud provider with an available India region is selected, satisfying data-localization 
needs identified in BRD Section 7. 
• A suitable OCR provider/model and a medical-domain NLP model (open-source, fine-tuned, or 
vendor) are evaluated and selected during a technical spike prior to full-scale development. 
• An LLM provider is selected with acceptable data-handling terms for a healthcare-adjacent use case 
(no training on customer data by default, or an equivalent contractual guarantee). 
• Partner pharmacies can provide at least a minimal digital feed (CSV/API) of stock and pricing, or will 
onboard onto a platform-provided inventory tool (per BRD Assumption). 
11.2 Dependencies 
• Razorpay merchant account and API credentials provisioned prior to payment-module integration 
testing. 
• Firebase project and SMS gateway (with India DLT registration) provisioned prior to notification-
module testing. 
• Legal/regulatory sign-off on data-retention periods and consent-language, feeding directly into the 
technical retention-policy configuration (Section 5.3). 
 

TRD v1.0 — Draft 
I.P. & M.D Platform — Technical Requirement Document   |   Page 21 of 21 
12. Glossary (Technical Additions) 
Term Definition 
BFF Backend-for-Frontend — an API layer tailored to client (web/mobile) needs, sitting in 
front of core services 
RBAC Role-Based Access Control — permissioning model based on assigned user roles 
RAG Retrieval-Augmented Generation — grounding LLM responses in retrieved reference 
content 
WORM Write Once, Read Many — storage model preventing modification/deletion after write, 
used for audit logs 
IaC Infrastructure as Code — managing cloud infrastructure via version-controlled 
configuration (e.g., Terraform) 
mTLS Mutual TLS — two-way certificate-based authentication between services 
Idempotency Key A client-supplied unique key ensuring a retried request is not processed twice  
 
This TRD is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0). Any scope 
changes identified during technical design should be reflected back into the BRD first, then propagated to 
this document and its companions (Database Schema, API Collection, App Flow, UI/UX, Integration Plan). 


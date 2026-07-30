I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 1 of 31 
I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
DATABASE SCHEMA DOCUMENT 
Version 1.0 | Draft for Review 
Prepared: July 2026 
Document 3 of 7 — Project Documentation Suite 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 2 of 31 
Document Control 
Document Title Database Schema Document — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Technical & Stakeholder Review 
Prepared Date July 2026 
Derived From BRD_IPMD_Platform_v1 (v1.0), TRD_IPMD_Platform_v1 (v1.0), 
API_Collection_IPMD_Platform_v1 (v1.0) 
Related Documents BRD, TRD, API Collection, App Flow, UI/UX, Integration Plan 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD v1.0, TRD v1.0, and API 
Collection v1.0 
Technical/Engineering 
Team 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 3 of 31 
Table of Contents 
Document Control .............................................................................................................................................................. 2 
Revision History .......................................................................................................................................................... 2 
Table of Contents................................................................................................................................................................ 3 
1. Introduction .................................................................................................................................................................... 4 
1.1 Purpose ..................................................................................................................................................................... 4 
1.2 Scope of This Document ........................................................................................................................................... 4 
1.3 Conventions Used in This Document ........................................................................................................................ 4 
1.4 Reference Documents .............................................................................................................................................. 4 
2. Entity-Relationship Overview ......................................................................................................................................... 5 
2.1 Cross-Domain Design Principles ............................................................................................................................... 5 
3. Entity Definitions by Domain .......................................................................................................................................... 6 
1. Identity & Access ........................................................................................................................................................ 6 
2. Prescription & Report Intake .................................................................................................................................... 10 
3. Catalog & Inventory .................................................................................................................................................. 13 
4. Orders & Fulfillment ................................................................................................................................................. 15 
5. Payments .................................................................................................................................................................. 18 
6. Notifications.............................................................................................................................................................. 20 
7. AI Health Chat Assistant ........................................................................................................................................... 22 
8. Audit & Compliance .................................................................................................................................................. 24 
4. Key Relationships Summary .......................................................................................................................................... 26 
5. Indexing Strategy .......................................................................................................................................................... 28 
5.1 Primary Access-Path Indexes .............................................................................................................................. 28 
5.2 Cursor-Pagination Support ................................................................................................................................. 28 
6. Data Retention & Deletion ........................................................................................................................................... 29 
7. Naming Conventions & Standards ................................................................................................................................ 30 
8. Glossary ........................................................................................................................................................................ 31 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 4 of 31 
1. Introduction 
1.1 Purpose 
This Database Schema Document defines the entity-relationship model, table definitions, and field-level constraints 
for Version 1 (V1) of the I.P. & M.D Platform. It provides the physical data design that the API Collection Document's 
endpoint contracts (Doc 4) are built against, and that the TRD's high-level data domains (TRD Section 5) resolve to at 
the table level. 
1.2 Scope of This Document 
This document covers relational table definitions, primary/foreign keys, field types, and constraints for every data 
domain identified in TRD Section 5.1. It does not restate endpoint-level request/response contracts (API Collection, 
Doc 4) or UI/screen flows (App Flow, Doc 5). Indexing recommendations are directional; final index tuning should be 
validated against production query patterns during implementation. 
1.3 Conventions Used in This Document 
● All primary keys are UUID (gen_random_uuid()) unless otherwise noted, consistent with the identifiers 
returned throughout the API Collection Document. 
● All timestamp fields use TIMESTAMPTZ (timezone-aware), stored in UTC. 
● ENUM fields are shown with their permitted values inline; recommended implementation is a native 
PostgreSQL ENUM type or a CHECK constraint, per team convention. 
● JSONB is used for semi-structured fields (addresses, metadata) where a fully normalized structure is not 
required for V1 query patterns. 
● Money values are stored as integer paise (BIGINT) for payment-module tables to avoid floating-point 
rounding, and as DECIMAL(10,2) for catalog/order pricing, matching Razorpay's amount convention. 
1.4 Reference Documents 
BRD_IPMD_Platform_v1 Business goals, scope, roles, functional requirements 
TRD_IPMD_Platform_v1 System architecture, module-wise technical requirements, security architecture, high-level 
data domains (Section 5) 
API Collection (Doc 4) Endpoint-level contracts that consume this schema 
App Flow (Doc 5) Screen-by-screen flow that these tables support 
Integration Plan (Doc 7) Third-party credential/config plan referenced by platform_settings 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 5 of 31 
2. Entity-Relationship Overview 
The schema is organized into eight data domains, matching TRD Section 5.1 exactly. Each domain owns a clear data-
access boundary so that, per the TRD's architectural approach (Section 2.1), any domain can be extracted into a 
standalone microservice in Phase 2/3 without a data-model rewrite. 
Domain Representative Tables Primary Storage 
1. Identity & Access 
users, doctor_licenses, pharmacy_profiles, 
permissions, admin_permissions, 
refresh_tokens, account_status_history, 
saved_addresses 
PostgreSQL 
2. Prescription & Report 
Intake 
documents, prescriptions, extracted_fields, 
reports, report_values, report_access_grants, 
verification_actions 
PostgreSQL (metadata) + Object Storage 
(files) 
3. Catalog & Inventory 
medicine_catalog_items, 
owned_inventory_stock, partner_pharmacies, 
partner_stock, generic_equivalent_map 
PostgreSQL 
4. Orders & Fulfillment 
carts, cart_items, orders, order_line_items, 
fulfillment_records, routing_decisions, 
order_disputes 
PostgreSQL 
5. Payments payment_intents, payment_captures, refunds, 
payout_ledger PostgreSQL 
6. Notifications notification_events, delivery_logs, 
user_channel_preferences PostgreSQL + Redis (queue) 
7. AI Health Chat Assistant chat_sessions, chat_messages, consent_records, 
knowledge_embeddings PostgreSQL + Vector Store (pgvector) 
8. Audit & Compliance audit_log_entries, compliance_overrides, 
platform_settings Append-only / WORM audit store 
 
2.1 Cross-Domain Design Principles 
● Uploaded prescriptions/reports are referenced from PostgreSQL by document_id only — original files are 
never stored as database BLOBs (TRD Section 5.2). 
● Redis-backed state (sessions, job queues, rate-limit counters, extraction-status cache) is short-lived only and 
is never the system of record; it is not modeled as a persistent table in this document. 
● Vector embeddings for the AI chat RAG corpus (knowledge_embeddings) are kept separate from PII-bearing 
transactional tables to simplify access-control and retention policies. 
● Row-level security or application-layer scoping is applied to partner-facing tables (partner_stock, 
payout_ledger) to isolate multi-tenant partner-pharmacy data. 
● The audit_log_entries table is append-only at the database-role level (no UPDATE/DELETE grants for any 
application role) per TRD Item 33. 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 6 of 31 
3. Entity Definitions by Domain 
1. Identity & Access 
Stores accounts for all seven platform role types, credentials/session state, admin permission grants, and address 
book data. Implements BRD Section 4.1 and TRD Section 7.1. 
users   [Identity & Access] 
Master account record for every role type (patient, doctor, pharmacy_staff_owned, partner_pharmacy, admin, user_admin, 
super_admin). 
Field Type Key Constraints Description 
user_id UUID PK 
NOT NULL, 
DEFAULT 
gen_random_uuid() 
Primary account 
identifier. 
role ENUM  NOT NULL 
patient | doctor | 
pharmacy_staff_owned 
| partner_pharmacy | 
admin | user_admin | 
super_admin. 
full_name VARCHAR(255)  NOT NULL Full legal name. 
email VARCHAR(255) UNIQUE NULL (cond. 
required) 
Login email; required if 
phone is not supplied. 
phone VARCHAR(20) UNIQUE NULL (cond. 
required) 
E.164 phone number; 
required if email is not 
supplied. 
password_hash VARCHAR(255)  NULL 
Hashed password; null 
for OTP/OAuth-only 
accounts. Never 
logged. 
oauth_provider VARCHAR(20)  NULL google | apple, set on 
first OAuth login. 
employer_partner_id UUID FK → 
partner_pharmacies.partner_id NULL 
Set for 
partner_pharmacy-role 
staff accounts. 
status ENUM  NOT NULL, 
DEFAULT 'pending' 
active | pending | 
suspended. Checked 
live on every request 
(TRD Item 28). 
created_at TIMESTAMPTZ  NOT NULL, 
DEFAULT now() 
Registration 
timestamp. 
updated_at TIMESTAMPTZ  NOT NULL Last profile update 
timestamp. 
 
doctor_licenses   [Identity & Access] 
Medical license/registration data captured at doctor registration and verified during User Admin KYC (BRD FR-23). 
Field Type Key Constraints Description 
license_id UUID PK NOT NULL Primary identifier. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 7 of 31 
Field Type Key Constraints Description 
user_id UUID 
FK → 
users.user_id, 
UNIQUE 
NOT NULL Doctor account this license belongs to. 
license_number VARCHAR(50)  NOT NULL Medical license/registration number. 
verification_status ENUM  
NOT NULL, 
DEFAULT 
'pending' 
pending | approved | rejected. 
verified_by UUID FK → 
users.user_id NULL User Admin / Super Admin who 
actioned the KYC check. 
verified_at TIMESTAMPTZ  NULL Timestamp of approval/rejection. 
rejection_reason TEXT  NULL (cond. 
required) 
Required when verification_status = 
rejected. 
 
pharmacy_profiles   [Identity & Access] 
Business/registration details for owned-pharmacy staff accounts (name, address, GSTIN). Partner-pharmacy organizations are 
separately modeled in partner_pharmacies (Catalog & Inventory). 
Field Type Key Constraints Description 
pharmacy_profile_id UUID PK NOT NULL Primary identifier. 
user_id UUID 
FK → 
users.user_id, 
UNIQUE 
NOT NULL pharmacy_staff_owned account this 
profile belongs to. 
pharmacy_name VARCHAR(255)  NOT NULL Trade/legal name of the owned 
pharmacy location. 
address JSONB  NOT NULL Structured address object. 
gstin VARCHAR(20)  NULL GST identification number. 
 
permissions   [Identity & Access] 
Master list of granular permission codes assignable to Admin / User Admin accounts (BRD FR-26). 
Field Type Key Constraints Description 
permission_id UUID PK NOT NULL Primary identifier. 
code VARCHAR(50) UNIQUE NOT NULL e.g. partner_onboarding, dispute_resolution. 
description VARCHAR(255)  NULL Human-readable description of the 
permission scope. 
 
admin_permissions   [Identity & Access] 
Join table mapping Admin/User Admin accounts to their granted permission set. Composite primary key. 
Field Type Key Constraints Description 
user_id UUID PK (1/2), FK → 
users.user_id NOT NULL Admin or User Admin account. 
permission_id UUID PK (2/2), FK → 
permissions.permission_id NOT NULL Granted permission. 
granted_by UUID FK → users.user_id NOT NULL Super Admin who granted the 
permission. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 8 of 31 
Field Type Key Constraints Description 
granted_at TIMESTAMPTZ  NOT NULL Grant timestamp. 
 
refresh_tokens   [Identity & Access] 
Long-lived refresh token records backing the JWT access/refresh pair (TRD Section 6.1). 
Field Type Key Constraints Description 
token_id UUID PK NOT NULL Primary identifier. 
user_id UUID FK → 
users.user_id NOT NULL Token owner. 
token_hash VARCHAR(255)  NOT NULL Hashed refresh token value; raw token 
never stored. 
issued_at TIMESTAMPTZ  NOT NULL Issue timestamp. 
expires_at TIMESTAMPTZ  NOT NULL Default TTL 30 days from issuance. 
revoked_at TIMESTAMPTZ  NULL Set on logout or rotation. 
 
account_status_history   [Identity & Access] 
Append-style history of every status transition on a user account, surfaced via GET /users/{user_id} (BRD FR-24). 
Field Type Key Constraints Description 
status_history_id UUID PK NOT NULL Primary identifier. 
user_id UUID FK → 
users.user_id NOT NULL Account whose status changed. 
status ENUM  NOT NULL active | pending | suspended (new value). 
reason_code VARCHAR(50)  NULL Mandatory for suspend/reinstate actions. 
changed_by UUID FK → 
users.user_id NULL Actor; null for system-driven transitions. 
changed_at TIMESTAMPTZ  NOT NULL Transition timestamp. 
 
saved_addresses   [Identity & Access] 
Patient delivery address book (BRD Section 3.1). 
Field Type Key Constraints Description 
address_id UUID PK NOT NULL Primary identifier. 
user_id UUID FK → 
users.user_id NOT NULL Owning patient. 
label VARCHAR(50)  NULL e.g. Home, Work. 
line1 VARCHAR(255)  NOT NULL Address line 1. 
line2 VARCHAR(255)  NULL Address line 2. 
city VARCHAR(100)  NOT NULL City. 
state VARCHAR(100)  NOT NULL State. 
pincode VARCHAR(10)  NOT NULL Postal code. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 9 of 31 
Field Type Key Constraints Description 
is_default BOOLEAN  NOT NULL, 
DEFAULT false Default delivery address flag. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 10 of 31 
2. Prescription & Report Intake 
Stores uploaded documents, AI-extracted structured data with per-field confidence, diagnostic report values, and 
doctor verification actions. Implements BRD FR-1 to FR-11 and TRD Section 4.1/4.3. 
documents   [Prescription & Report Intake] 
Immutable reference to every original uploaded file, stored in object storage and never as a database BLOB (TRD Item 2, Secti on 
5.2). 
Field Type Key Constraints Description 
document_id UUID PK NOT NULL Primary identifier, referenced by 
prescriptions/reports. 
uploaded_by UUID FK → 
users.user_id NOT NULL Uploading patient. 
storage_url VARCHAR(500)  NOT NULL Object storage key/URL (AES-256 
encrypted at rest). 
file_type ENUM  NOT NULL jpg | png | pdf. 
file_size_bytes INTEGER  NOT NULL Upload size; validated against the 
configured max (default 20 MB). 
malware_scan_status ENUM  
NOT NULL, 
DEFAULT 
'pending' 
pending | clean | rejected. 
uploaded_at TIMESTAMPTZ  NOT NULL Upload timestamp. 
 
prescriptions   [Prescription & Report Intake] 
One record per uploaded prescription; tracks both the AI extraction lifecycle and the doctor verification decision (BRD FR -1 to FR-5). 
Field Type Key Constraints Description 
prescription_id UUID PK NOT NULL Primary identifier. 
patient_id UUID FK → users.user_id NOT NULL Owning patient. 
doctor_id UUID FK → users.user_id NULL Linked/assigned reviewing 
doctor. 
document_id UUID FK → 
documents.document_id NOT NULL Underlying original file. 
extraction_status ENUM  NOT NULL, 
DEFAULT 'queued' 
queued | processing | 
extracted | needs_review | 
failed. 
verification_status ENUM  
NOT NULL, 
DEFAULT 
'pending_review' 
pending_review | 
doctor_verified | rejected. 
Gates Schedule H/H1/X 
checkout. 
created_at TIMESTAMPTZ  NOT NULL Upload timestamp. 
 
extracted_fields   [Prescription & Report Intake] 
Structured, per-field AI extraction output with confidence scoring (TRD Item 3-4). Rows below the confidence threshold default to 
needs_review. 
Field Type Key Constraints Description 
field_id UUID PK NOT NULL Primary identifier. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 11 of 31 
Field Type Key Constraints Description 
prescription_id UUID FK → 
prescriptions.prescription_id NOT NULL Parent prescription. 
field_name VARCHAR(50)  NOT NULL 
medicine_name | strength | 
dosage | frequency | duration | 
prescribing_doctor | date. 
value TEXT  NOT NULL Extracted or doctor-corrected 
value. 
confidence_score DECIMAL(4,3)  NOT NULL Model confidence, 0.000–1.000 
(default review threshold 0.85). 
review_state ENUM  NOT NULL auto_accepted | needs_review 
| doctor_edited. 
edited_by UUID FK → users.user_id NULL Doctor who last corrected this 
field. 
edited_reason TEXT  NULL Optional free-text reason for a 
correction. 
 
reports   [Prescription & Report Intake] 
One record per uploaded diagnostic report (blood panel, sonography, CT scan, etc.), BRD FR-1/FR-3. 
Field Type Key Constraints Description 
report_id UUID PK NOT NULL Primary identifier. 
patient_id UUID FK → users.user_id NOT NULL Owning patient. 
document_id UUID FK → 
documents.document_id NOT NULL Underlying original file. 
report_type VARCHAR(50)  NULL 
blood_panel | sonography | 
ct_scan | ... — routes NLP model 
selection. 
extraction_status ENUM  
NOT NULL, 
DEFAULT 
'queued' 
queued | processing | extracted 
| needs_review | failed. 
ai_explanation TEXT  NULL 
Plain-language explanation, 
present when any value is 
flagged abnormal. 
created_at TIMESTAMPTZ  NOT NULL Upload timestamp. 
 
report_values   [Prescription & Report Intake] 
Individual structured test-result rows extracted from a report. 
Field Type Key Constraints Description 
value_id UUID PK NOT NULL Primary identifier. 
report_id UUID FK → 
reports.report_id NOT NULL Parent report. 
test_name VARCHAR(100)  NOT NULL e.g. Fasting Glucose, ALT. 
value VARCHAR(50)  NOT NULL Measured value. 
unit VARCHAR(20)  NULL Unit of measure. 
reference_range VARCHAR(50)  NULL Normal reference range. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 12 of 31 
Field Type Key Constraints Description 
flag ENUM  NOT NULL normal | abnormal. 
 
report_access_grants   [Prescription & Report Intake] 
Tracks which doctors have been granted access to a given patient report (BRD Doctor Capabilities). 
Field Type Key Constraints Description 
grant_id UUID PK NOT NULL Primary identifier. 
report_id UUID FK → 
reports.report_id NOT NULL Report being shared. 
doctor_id UUID FK → 
users.user_id NOT NULL Doctor granted access. 
granted_at TIMESTAMPTZ  NOT NULL Grant timestamp. 
 
verification_actions   [Prescription & Report Intake] 
Immutable, timestamped record of every approve/reject/edit action taken on a prescription (BRD FR-11, TRD Item 12). Referenced 
by the audit log store. 
Field Type Key Constraints Description 
verification_action_id UUID PK NOT NULL Primary identifier. 
prescription_id UUID FK → 
prescriptions.prescription_id NOT NULL Prescription being 
actioned. 
doctor_id UUID FK → users.user_id NOT NULL Acting doctor. 
action ENUM  NOT NULL approve | reject | 
field_edit. 
notes_or_reason TEXT  
NULL (cond. 
required for 
reject) 
Reviewer notes or 
mandatory rejection 
reason. 
created_at TIMESTAMPTZ  NOT NULL Action timestamp; 
immutable once written. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 13 of 31 
3. Catalog & Inventory 
Unified medicine catalog spanning owned-warehouse and partner-pharmacy stock, de-duplicated by standard 
medicine identifier (BRD FR-12/FR-13, TRD Item 14-15). 
medicine_catalog_items   [Catalog & Inventory] 
Canonical catalog entry per sellable medicine, keyed by a standard identifier independent of stock source. 
Field Type Key Constraints Description 
medicine_id UUID PK NOT NULL Primary identifier. 
standard_identifier VARCHAR(50) UNIQUE NOT NULL De-duplication key across owned and 
partner SKUs. 
name VARCHAR(255)  NOT NULL Brand name. 
generic_name VARCHAR(255)  NULL Generic/equivalent name. 
schedule ENUM  NOT NULL otc | h | h1 | x — regulatory dispensing 
category. 
created_at TIMESTAMPTZ  NOT NULL Catalog entry creation timestamp. 
 
owned_inventory_stock   [Catalog & Inventory] 
Warehouse stock records for owned inventory, including batch/expiry tracking (BRD Pharmacy Staff Capabilities).  
Field Type Key Constraints Description 
stock_id UUID PK NOT NULL Primary identifier. 
medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL Catalog item this stock 
record fulfils. 
batch_number VARCHAR(50)  NOT NULL Batch/lot identifier. 
expiry_date DATE  NOT NULL Batch expiry date. 
quantity INTEGER  NOT NULL, 
CHECK >= 0 Units on hand. 
price DECIMAL(10,2)  NOT NULL Unit price (INR). 
updated_at TIMESTAMPTZ  NOT NULL Last stock update. 
 
partner_pharmacies   [Catalog & Inventory] 
Onboarded partner-pharmacy organizations participating in the hybrid fulfillment network (BRD FR-20). 
Field Type Key Constraints Description 
partner_id UUID PK NOT NULL Primary identifier. 
name VARCHAR(255)  NOT NULL Partner legal/trade name. 
address JSONB  NOT NULL Registered address. 
gstin VARCHAR(20)  NULL GST identification number. 
fulfillment_radius_km DECIMAL(6,2)  NOT NULL Delivery radius used by the order-
routing engine. 
catalog_feed_url VARCHAR(500)  NULL Digital stock/pricing feed endpoint, if 
available. 
status ENUM  NOT NULL, DEFAULT 
'pending_activation' 
pending_activation | active | suspended 
| delisted. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 14 of 31 
Field Type Key Constraints Description 
created_at TIMESTAMPTZ  NOT NULL Onboarding timestamp. 
 
partner_stock   [Catalog & Inventory] 
Per-partner stock and pricing records linked to the shared catalog item. UNIQUE(partner_id, medicine_id). 
Field Type Key Constraints Description 
stock_id UUID PK NOT NULL Primary identifier. 
partner_id UUID FK → 
partner_pharmacies.partner_id NOT NULL Owning partner 
pharmacy. 
medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL Catalog item this stock 
record fulfils. 
quantity INTEGER  NOT NULL, 
CHECK >= 0 
Units available, per last 
feed sync. 
price DECIMAL(10,2)  NOT NULL Unit price (INR). 
last_synced_at TIMESTAMPTZ  NULL 
Last successful feed 
ingestion; drives stale-
feed de-listing. 
 
generic_equivalent_map   [Catalog & Inventory] 
Substitution mapping used by the prescription-to-SKU matching engine (TRD Item 15). UNIQUE(medicine_id, 
equivalent_medicine_id). 
Field Type Key Constraints Description 
mapping_id UUID PK NOT NULL Primary identifier. 
medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL Source catalog 
item. 
equivalent_medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL 
Substitutable 
generic-equivalent 
item. 
created_at TIMESTAMPTZ  NOT NULL Mapping creation 
timestamp. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 15 of 31 
4. Orders & Fulfillment 
Carts, orders, per-line-item fulfillment routing, and dispute records, including the non-bypassable Schedule H/H1/X 
compliance gate (BRD FR-14/FR-15, TRD Item 17/34). 
carts   [Orders & Fulfillment] 
Patient shopping cart, converted to an order at checkout. 
Field Type Key Constraints Description 
cart_id UUID PK NOT NULL Primary identifier. 
patient_id UUID FK → 
users.user_id NOT NULL Owning patient. 
status ENUM  NOT NULL, 
DEFAULT 'active' active | converted | abandoned. 
created_at TIMESTAMPTZ  NOT NULL Cart creation timestamp. 
 
cart_items   [Orders & Fulfillment] 
Line items within a cart. Schedule H/H1/X items require a linked doctor_verified prescription or are flagged checkout_blocked  (TRD 
Item 17). 
Field Type Key Constraints Description 
cart_item_id UUID PK NOT NULL Primary identifier. 
cart_id UUID FK → carts.cart_id NOT NULL Parent cart. 
medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL Catalog item added. 
quantity INTEGER  NOT NULL, 
CHECK > 0 Units requested. 
prescription_id UUID FK → prescriptions.prescription_id NULL (cond. 
required) 
Required for Schedule 
H/H1/X items. 
checkout_blocked BOOLEAN  NOT NULL, 
DEFAULT false 
True if this item lacks a 
doctor_verified 
prescription. 
 
orders   [Orders & Fulfillment] 
An order created from a cart at checkout (BRD FR-14/FR-15). Idempotency-Key enforced at creation. 
Field Type Key Constraints Description 
order_id UUID PK NOT NULL Primary identifier. 
patient_id UUID FK → users.user_id NOT NULL Ordering patient. 
cart_id UUID FK → carts.cart_id, UNIQUE NOT NULL Source cart. 
delivery_address_id UUID FK → 
saved_addresses.address_id NOT NULL Shipping destination. 
status ENUM  
NOT NULL, 
DEFAULT 
'placed' 
placed | processing | 
dispatched | delivered | 
cancelled. 
payment_status ENUM  
NOT NULL, 
DEFAULT 
'pending' 
pending | captured | 
refunded | failed. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 16 of 31 
Field Type Key Constraints Description 
idempotency_key VARCHAR(100) UNIQUE NOT NULL 
Client-supplied key 
preventing duplicate order 
creation. 
created_at TIMESTAMPTZ  NOT NULL Order placement 
timestamp. 
 
order_line_items   [Orders & Fulfillment] 
Per-medicine line items within an order, each independently routed to a fulfillment source. 
Field Type Key Constraints Description 
line_item_id UUID PK NOT NULL Primary identifier. 
order_id UUID FK → orders.order_id NOT NULL Parent order. 
medicine_id UUID FK → 
medicine_catalog_items.medicine_id NOT NULL Ordered catalog item. 
prescription_id UUID FK → prescriptions.prescription_id NULL (cond. 
required) 
Required for regulated 
items; hard-enforced 
server-side. 
quantity INTEGER  NOT NULL, 
CHECK > 0 Units ordered. 
unit_price DECIMAL(10,2)  NOT NULL Price at time of order. 
status ENUM  
NOT NULL, 
DEFAULT 
'pending' 
pending | confirmed | 
dispatched | delivered | 
cancelled. 
 
fulfillment_records   [Orders & Fulfillment] 
Resolved fulfillment source per line item, selected by the order-routing engine (weighted on stock, price, delivery SLA). 
Field Type Key Constraints Description 
fulfillment_record_id UUID PK NOT NULL Primary identifier. 
line_item_id UUID 
FK → 
order_line_items.line_item_id, 
UNIQUE 
NOT NULL Line item being 
fulfilled. 
source_type ENUM  NOT NULL owned | partner. 
source_id UUID 
Polymorphic → 
owned_inventory_stock.stock_id 
or 
partner_pharmacies.partner_id 
NOT NULL 
Resolved fulfillment 
source, keyed by 
source_type. 
status ENUM  
NOT NULL, 
DEFAULT 
'assigned' 
assigned | dispatched | 
delivered. 
dispatched_at TIMESTAMPTZ  NULL Dispatch timestamp. 
delivered_at TIMESTAMPTZ  NULL Delivery timestamp. 
 
routing_decisions   [Orders & Fulfillment] 
Audit trail of automated and manually overridden fulfillment-source decisions (BRD Section 4.1 — dispute resolution). 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 17 of 31 
Field Type Key Constraints Description 
routing_decision_id UUID PK NOT NULL Primary identifier. 
line_item_id UUID FK → 
order_line_items.line_item_id NOT NULL Line item being routed. 
decision_basis VARCHAR(50)  NOT NULL stock | price | delivery_sla | 
manual_override. 
source_type ENUM  NOT NULL owned | partner. 
source_id UUID  NOT NULL Selected fulfillment source. 
overridden_by UUID FK → users.user_id NULL 
Admin who manually re-
routed this item, if 
applicable. 
reason TEXT  
NULL (cond. 
required for 
override) 
Mandatory justification for 
manual overrides. 
created_at TIMESTAMPTZ  NOT NULL Decision timestamp. 
 
order_disputes   [Orders & Fulfillment] 
Orders flagged for Admin dispute resolution (routing conflicts, stock discrepancies, refund mismatches). 
Field Type Key Constraints Description 
dispute_id UUID PK NOT NULL Primary identifier. 
order_id UUID FK → 
orders.order_id NOT NULL Disputed order. 
dispute_type VARCHAR(50)  NOT NULL e.g. routing_conflict, stock_discrepancy, 
refund_mismatch. 
flagged_at TIMESTAMPTZ  NOT NULL When the dispute was raised. 
resolved_by UUID FK → 
users.user_id NULL Admin who resolved the dispute. 
resolved_at TIMESTAMPTZ  NULL Resolution timestamp. 
resolution TEXT  NULL Free-text resolution summary. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 18 of 31 
5. Payments 
Server-side Razorpay order/capture/refund records and partner settlement ledger (BRD FR-16 to FR-18, TRD Item 18-
20). 
payment_intents   [Payments] 
Server-created Razorpay order, always created before client payment initiation (TRD Item 18). 
Field Type Key Constraints Description 
payment_intent_id UUID PK NOT NULL Primary identifier. 
order_id UUID FK → 
orders.order_id NOT NULL Platform order this payment is for. 
razorpay_order_id VARCHAR(100)  NOT NULL Razorpay-side order ID for client checkout 
initiation. 
amount_paise BIGINT  NOT NULL Amount in INR paise; must match 
order.payment_required_amount. 
status ENUM  
NOT NULL, 
DEFAULT 
'created' 
created | captured | failed. 
idempotency_key VARCHAR(100) UNIQUE NOT NULL Prevents duplicate intent creation on 
retry. 
created_at TIMESTAMPTZ  NOT NULL Creation timestamp. 
 
payment_captures   [Payments] 
Client payment completion, reconciled server-side against the Razorpay Orders API before an order is marked paid. 
Field Type Key Constraints Description 
capture_id UUID PK NOT NULL Primary identifier. 
payment_intent_id UUID FK → 
payment_intents.payment_intent_id NOT NULL Intent being 
captured. 
razorpay_payment_id VARCHAR(100)  NOT NULL 
Payment ID returned 
by the Razorpay 
client SDK. 
razorpay_signature VARCHAR(255)  NOT NULL 
Signature used for 
server-side 
verification. 
status ENUM  NOT NULL captured | failed. 
captured_at TIMESTAMPTZ  NOT NULL Capture timestamp. 
 
refunds   [Payments] 
Refund records for cancelled/returned/out-of-stock items, reconciled nightly against Razorpay (TRD Item 20). Supports partial 
refunds. 
Field Type Key Constraints Description 
refund_id UUID PK NOT NULL Primary identifier. 
payment_intent_id UUID FK → 
payment_intents.payment_intent_id NOT NULL Payment being 
refunded against. 
amount_paise BIGINT  NOT NULL Refund amount in 
paise. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 19 of 31 
Field Type Key Constraints Description 
reason ENUM  NOT NULL cancelled | returned | 
out_of_stock. 
status ENUM  
NOT NULL, 
DEFAULT 
'processing' 
processing | 
completed | failed. 
razorpay_refund_id VARCHAR(100)  NULL Razorpay-side refund 
reference. 
created_at TIMESTAMPTZ  NOT NULL Refund initiation 
timestamp. 
 
payout_ledger   [Payments] 
Partner-pharmacy settlement records for marketplace-fulfilled orders (TRD Item 19). 
Field Type Key Constraints Description 
payout_id UUID PK NOT NULL Primary identifier. 
partner_id UUID FK → 
partner_pharmacies.partner_id NOT NULL Receiving partner pharmacy. 
order_id UUID FK → orders.order_id NOT NULL Order this payout settles. 
amount_paise BIGINT  NOT NULL Gross settlement amount. 
commission_paise BIGINT  NOT NULL Platform commission 
withheld. 
status ENUM  
NOT NULL, 
DEFAULT 
'pending' 
pending | settled | failed. 
settled_at TIMESTAMPTZ  NULL Settlement timestamp. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 20 of 31 
6. Notifications 
Fan-out notification events, per-channel delivery logs, and channel opt-in preferences (BRD FR-19, TRD Item 22-23). 
notification_events   [Notifications] 
In-app notification record generated from a domain event (order confirmed, verification result, dispatch, delivery, refill reminder, 
abnormal report flag). 
Field Type Key Constraints Description 
notification_id UUID PK NOT NULL Primary identifier. 
user_id UUID FK → 
users.user_id NOT NULL Recipient. 
type VARCHAR(50)  NOT NULL 
order_confirmation | verification_result 
| dispatch | delivery | refill_reminder | 
abnormal_report_flag. 
related_entity_type VARCHAR(50)  NULL e.g. order, prescription, report. 
related_entity_id UUID  NULL ID of the related entity. 
message TEXT  NOT NULL Rendered notification body. 
read BOOLEAN  NOT NULL, 
DEFAULT false Read/unread state. 
created_at TIMESTAMPTZ  NOT NULL Event timestamp. 
 
delivery_logs   [Notifications] 
Per-channel delivery attempt log; failed sends never block the underlying business transaction (TRD Item 23). 
Field Type Key Constraints Description 
delivery_log_id UUID PK NOT NULL Primary identifier. 
notification_id UUID FK → 
notification_events.notification_id NOT NULL Source notification. 
channel ENUM  NOT NULL push | email | sms. 
status ENUM  NOT NULL sent | failed. 
error_detail TEXT  NULL Failure reason, if any. 
attempted_at TIMESTAMPTZ  NOT NULL Delivery attempt 
timestamp. 
 
user_channel_preferences   [Notifications] 
Per-user, per-channel opt-in flags feeding the notification fan-out engine. 
Field Type Key Constraints Description 
user_id UUID PK, FK → 
users.user_id NOT NULL Owning user. 
push_enabled BOOLEAN  NOT NULL, 
DEFAULT true Firebase push opt-in. 
email_enabled BOOLEAN  NOT NULL, 
DEFAULT true Transactional email opt-in. 
sms_enabled BOOLEAN  NOT NULL, 
DEFAULT true SMS opt-in. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 21 of 31 
Field Type Key Constraints Description 
updated_at TIMESTAMPTZ  NOT NULL Last preference change. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 22 of 31 
7. AI Health Chat Assistant 
Consent-gated chat sessions/messages and the RAG knowledge base backing the assistant (BRD FR-6 to FR-8, TRD 
Item 7-10). 
chat_sessions   [AI Health Chat Assistant] 
A single AI Health Chat Assistant conversation, optionally grounded to a prescription context. 
Field Type Key Constraints Description 
session_id UUID PK NOT NULL Primary identifier. 
patient_id UUID FK → users.user_id NOT NULL Session owner. 
context_prescription_id UUID FK → 
prescriptions.prescription_id NULL Optional grounding 
context. 
consent_record_id UUID FK → 
consent_records.consent_id NULL Consent record 
permitting logging. 
created_at TIMESTAMPTZ  NOT NULL Session start timestamp. 
purged_at TIMESTAMPTZ  NULL 
Set when the user 
purges the session 
ahead of retention 
expiry. 
 
chat_messages   [AI Health Chat Assistant] 
Individual exchanges within a session, persisted only when logging consent has been recorded. 
Field Type Key Constraints Description 
message_id UUID PK NOT NULL Primary identifier. 
session_id UUID FK → 
chat_sessions.session_id NOT NULL Parent session. 
sender ENUM  NOT NULL user | assistant. 
text TEXT  NOT NULL Message content. 
is_ai_generated BOOLEAN  NOT NULL, 
DEFAULT false 
True for assistant replies (TRD 
Item 36 disclosure). 
guardrail_triggered BOOLEAN  NOT NULL, 
DEFAULT false 
True if the fixed 
disclaimer/redirect path was 
used. 
created_at TIMESTAMPTZ  NOT NULL Message timestamp. 
 
consent_records   [AI Health Chat Assistant] 
Explicit DPDP-aligned consent capture, required before first-message logging (TRD Item 10). 
Field Type Key Constraints Description 
consent_id UUID PK NOT NULL Primary identifier. 
user_id UUID FK → 
users.user_id NOT NULL Consenting user. 
consent_type VARCHAR(50)  
NOT NULL, 
DEFAULT 
'chat_logging' 
Purpose-limitation tag. 
consent_given BOOLEAN  NOT NULL True to allow logging; false disables 
persistence. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 23 of 31 
Field Type Key Constraints Description 
recorded_at TIMESTAMPTZ  NOT NULL Capture timestamp. 
 
knowledge_embeddings   [AI Health Chat Assistant] 
Vector-store rows backing RAG grounding for the chat assistant, kept separate from PII-bearing transactional tables (TRD Section 
5.2). 
Field Type Key Constraints Description 
embedding_id UUID PK NOT NULL Primary identifier. 
source_reference VARCHAR(255)  NOT NULL Reference to the curated medicine/FAQ 
source document. 
content_chunk TEXT  NOT NULL Chunked source text. 
embedding VECTOR(1536)  NOT NULL pgvector embedding used for similarity 
search. 
metadata JSONB  NULL Chunk metadata (category, tags). 
created_at TIMESTAMPTZ  NOT NULL Indexing timestamp. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 24 of 31 
8. Audit & Compliance 
Append-only audit trail, compliance overrides, and versioned platform-wide configuration (BRD FR-26 to FR-29, TRD 
Item 30-33, Section 7.4). 
audit_log_entries   [Audit & Compliance] 
Append-only log covering every doctor verification action, admin-tier account action, compliance override, and regulated-medicine 
order transition. No UPDATE/DELETE grants at the database-role level (TRD Item 33). 
Field Type Key Constraints Description 
audit_log_id UUID PK NOT NULL Primary identifier. 
actor_id UUID FK → 
users.user_id NULL Acting user; null for system-generated 
entries. 
actor_role VARCHAR(30)  NOT NULL Role of the actor at time of action. 
action_type VARCHAR(100)  NOT NULL e.g. prescription.approve, 
account.suspend, settings.update. 
target_entity_type VARCHAR(50)  NOT NULL Entity type affected (prescription, order, 
user, settings, ...). 
target_entity_id UUID  NOT NULL Identifier of the affected entity. 
justification TEXT  NULL (cond. 
required) 
Mandatory for suspensions, overrides, 
route-overrides. 
timestamp TIMESTAMPTZ  NOT NULL Immutable action timestamp. 
 
compliance_overrides   [Audit & Compliance] 
Super Admin override of a regulated-order compliance block, always paired with an audit log entry (BRD FR-28). 
Field Type Key Constraints Description 
override_id UUID PK NOT NULL Primary identifier. 
order_id UUID FK → orders.order_id NOT NULL Order whose compliance block 
was overridden. 
super_admin_id UUID FK → users.user_id NOT NULL Authorizing Super Admin. 
justification TEXT  NOT NULL Mandatory justification text. 
audit_log_id UUID FK → 
audit_log_entries.audit_log_id NOT NULL Linked audit entry. 
created_at TIMESTAMPTZ  NOT NULL Override timestamp. 
 
platform_settings   [Audit & Compliance] 
Versioned platform-wide configuration (commission rates, gateway credential references, security policies). Credential values are 
write-only and never returned in plaintext (TRD Item 31). 
Field Type Key Constraints Description 
setting_key VARCHAR(100) PK NOT NULL Configuration key, e.g. 
commission_rate_pct. 
setting_value TEXT  NOT NULL Current value (credentials stored as a 
masked/encrypted reference). 
config_version INTEGER  NOT NULL Incremented on every change; supports 
change-history rollback. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 25 of 31 
Field Type Key Constraints Description 
updated_by UUID FK → 
users.user_id NOT NULL Super Admin who applied the change. 
updated_at TIMESTAMPTZ  NOT NULL Change timestamp. 
 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 26 of 31 
4. Key Relationships Summary 
The table below highlights the primary foreign-key relationships that connect the eight data domains. Full constraint 
definitions are listed within each table's field list in Section 3. 
From To Cardinality Notes 
users.user_id doctor_licenses.user_id 1 : 1 
A doctor account 
has exactly one 
license record. 
users.user_id prescriptions.patient_id / doctor_id 1 : N 
A patient uploads 
many prescriptions; 
a doctor is assigned 
many. 
prescriptions.prescription_id extracted_fields.prescription_id 1 : N 
Each prescription 
has many extracted 
fields. 
prescriptions.prescription_id verification_actions.prescription_id 1 : N 
Full history of 
approve/reject/edit 
actions. 
reports.report_id report_values.report_id 1 : N 
Each report has 
many structured 
test-value rows. 
medicine_catalog_items.medicine_id owned_inventory_stock.medicine_id / 
partner_stock.medicine_id 1 : N 
A catalog item may 
be stocked by 
owned inventory 
and/or many 
partners. 
partner_pharmacies.partner_id partner_stock.partner_id 1 : N 
A partner stocks 
many catalog 
items. 
carts.cart_id cart_items.cart_id 1 : N A cart holds many 
line items. 
orders.order_id order_line_items.order_id 1 : N 
An order holds 
many line items, 
one per medicine. 
order_line_items.line_item_id fulfillment_records.line_item_id 1 : 1 
Each line item 
resolves to exactly 
one active 
fulfillment source. 
orders.order_id payment_intents.order_id 1 : N 
Split-fulfillment 
orders may hold 
multiple linked 
payment intents. 
payment_intents.payment_intent_id payment_captures.payment_intent_id / 
refunds.payment_intent_id 1 : N 
A payment intent 
may have one 
capture and 
multiple partial 
refunds. 
users.user_id (patient) chat_sessions.patient_id 1 : N 
A patient may start 
many chat 
sessions. 
chat_sessions.session_id chat_messages.session_id 1 : N A session holds 
many messages. 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 27 of 31 
users.user_id audit_log_entries.actor_id 1 : N 
Every 
admin/doctor 
action is traceable 
to an actor. 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 28 of 31 
5. Indexing Strategy 
Indexing recommendations below are directional and should be validated against real query patterns and load-test 
results prior to production launch, per TRD Section 8 (Performance NFRs). 
5.1 Primary Access-Path Indexes 
● users: UNIQUE index on email, UNIQUE index on phone; composite index on (role, status) for admin account 
listings. 
● prescriptions: index on (patient_id, extraction_status), index on (doctor_id, verification_status) — backs the 
doctor verification queue (GET /verification/queue). 
● extracted_fields: index on prescription_id. 
● orders / order_line_items: index on (patient_id, status), index on order_id for line items; index on 
idempotency_key (UNIQUE). 
● fulfillment_records: index on (source_type, source_id, status) for pharmacy-staff fulfillment queues. 
● payment_intents / payment_captures: index on order_id; UNIQUE index on razorpay_payment_id. 
● notification_events: index on (user_id, read, created_at DESC) for the notification inbox list. 
● audit_log_entries: composite index on (actor_role, action_type, timestamp) and index on 
(target_entity_type, target_entity_id) for the Super Admin audit query endpoint. 
● knowledge_embeddings: ivfflat or hnsw vector index on the embedding column (pgvector) for RAG similarity 
search. 
5.2 Cursor-Pagination Support 
List endpoints using cursor-based pagination (orders, catalog, audit logs — per API Collection Section 2.4) require a 
stable, monotonically increasing sort key. Recommended approach: a composite (created_at, <table>_id) index, with 
the cursor opaquely encoding both values to guarantee stable ordering across pages even when created_at collides. 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 29 of 31 
6. Data Retention & Deletion 
Directly implements TRD Section 5.3 and BRD Section 7 (DPDP Act alignment) at the table level. 
● Retention periods for chat logs (chat_sessions, chat_messages), uploaded documents (documents), and audit 
logs are configurable via platform_settings, defaulting to the minimum period needed for regulatory/audit 
purposes. 
● chat_sessions.purged_at supports user-initiated purge ahead of the configured retention period (DELETE 
/chat/sessions/{session_id}), per the user's DPDP Act data-deletion rights. 
● audit_log_entries rows are exempt from user-initiated deletion requests (legal/compliance requirement) but 
are subject to access restriction, not erasure. 
● User-initiated account deletion triggers a data-minimization workflow: PII in users/saved_addresses is 
anonymized/pseudonymized where retention is legally required (e.g. linked financial/audit records in 
payment_captures, audit_log_entries), and fully deleted where not. 
● Health-data-bearing tables (extracted_fields, report_values, chat_messages) carry stricter field-level access 
logging than generic account data, per TRD Section 7.2. 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 30 of 31 
7. Naming Conventions & Standards 
● Table names: lower_snake_case, plural nouns (e.g., orders, extracted_fields). 
● Primary key columns: <singular_table_name>_id (e.g., order_id, prescription_id), type UUID. 
● Foreign key columns: named identically to the referenced primary key (e.g., orders.patient_id references 
users.user_id) to make joins self-documenting. 
● Boolean columns: prefixed with is_/has_ where practical, or a clear participle (e.g., checkout_blocked, read). 
● Timestamp columns: suffixed _at (created_at, verified_at, dispatched_at); date-only fields suffixed _date 
(expiry_date). 
● Enumerated status columns are named status or a specific <domain>_status (e.g., verification_status, 
extraction_status) to avoid ambiguity where an entity carries more than one status dimension. 
● Money columns store integer paise and are suffixed _paise in payment-module tables; catalog/order pricing 
uses DECIMAL(10,2) columns named price or unit_price. 
 

I.P. & M.D Platform — Database Schema Document 
Database Schema Document v1.0 — Draft   |   Page 31 of 31 
8. Glossary 
Term Definition 
PK / FK Primary Key / Foreign Key. 
UUID Universally Unique Identifier — used as the primary key type across all V1 tables. 
JSONB PostgreSQL's binary JSON column type, used for semi-structured fields. 
pgvector PostgreSQL extension providing vector similarity search, used for the RAG knowledge base. 
WORM Write Once, Read Many — storage model preventing modification/deletion after write, used for 
audit logs. 
Schedule H/H1/X Categories of drugs under Indian law requiring a valid, verified prescription to dispense. 
DPDP Act Digital Personal Data Protection Act (India, 2023). 
Idempotency Key A client-supplied unique key ensuring a retried request is not processed twice. 
RAG Retrieval-Augmented Generation — grounding LLM responses in retrieved reference content. 
Note: This Database Schema Document is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0), 
TRD_IPMD_Platform_v1 (v1.0), and API_Collection_IPMD_Platform_v1 (v1.0). Any scope changes identified during physical 
data modeling should be reflected back into the BRD/TRD/API Collection first, then propagated to this document and the 
remaining companions (App Flow, UI/UX, Integration Plan). 


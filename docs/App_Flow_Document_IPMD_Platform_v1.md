I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 1 of 19 
I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
APP FLOW DOCUMENT 
Version 1.0 | Draft for Review 
Prepared: July 2026 
Document 5 of 7 — Project Documentation Suite 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 2 of 19 
Document Control 
Document Title App Flow Document — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Technical & Stakeholder Review 
Prepared Date July 2026 
Derived From BRD_IPMD_Platform_v1 (v1.0), TRD_IPMD_Platform_v1 (v1.0), 
API_Collection_IPMD_Platform_v1 (v1.0), Database Schema Document (v1.0) 
Related Documents BRD, TRD, API Collection, Database Schema, UI/UX, Integration Plan 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD v1.0, TRD v1.0, API Collection 
v1.0, and the Database Schema Document Product/Technical Team 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 3 of 19 
Table of Contents 
Document Control .............................................................................................................................................................. 2 
Revision History .......................................................................................................................................................... 2 
Table of Contents................................................................................................................................................................ 3 
1. Introduction .................................................................................................................................................................... 4 
1.1 Purpose ..................................................................................................................................................................... 4 
1.2 Scope of This Document ........................................................................................................................................... 4 
1.3 How to Read This Document .................................................................................................................................... 4 
1.4 Reference Documents .............................................................................................................................................. 4 
2. App Flow Conventions .................................................................................................................................................... 5 
3. Cross-Cutting Flow: Registration, Login & Session ......................................................................................................... 6 
4. Role-Specific Flows ......................................................................................................................................................... 7 
4.1 Patient App Flow ....................................................................................................................................................... 7 
4.2 Doctor App Flow ..................................................................................................................................................... 10 
4.3 Pharmacy Staff (Owned) Flow ................................................................................................................................ 11 
4.4 Partner Pharmacy Flow........................................................................................................................................... 12 
4.5 Admin Panel Flow (Operations) .............................................................................................................................. 13 
4.6 User Admin Panel Flow ........................................................................................................................................... 14 
4.7 Super Admin Panel Flow ......................................................................................................................................... 15 
5. Core State-Transition Models ....................................................................................................................................... 16 
5.1 Prescription Lifecycle .......................................................................................................................................... 16 
5.2 Order Lifecycle .................................................................................................................................................... 16 
5.3 Payment Lifecycle ............................................................................................................................................... 16 
5.4 Account Status Lifecycle ..................................................................................................................................... 16 
6. Screen Inventory by Role .............................................................................................................................................. 18 
7. Glossary ........................................................................................................................................................................ 19 
 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 4 of 19 
1. Introduction 
1.1 Purpose 
This App Flow Document defines the screen-by-screen and state-transition flow for Version 1 (V1) of the I.P. & M.D 
Platform, across web (React + Next.js) and mobile (Flutter). It translates the functional requirements in the BRD and 
the endpoint contracts in the API Collection Document (Doc 4) into a concrete navigation and interaction sequence 
for each of the platform's seven role types. 
1.2 Scope of This Document 
This document covers screen sequencing, user actions, the API call(s) each screen triggers, and the resulting state 
transition or next screen. It does not define visual design, layout, or component styling — those are covered in the 
UI/UX Document (Doc 6) — nor does it restate field-level request/response schemas, which live in the API Collection 
Document (Doc 4). 
1.3 How to Read This Document 
Each flow is presented as a numbered step sequence in tabular form: the screen the user is on, the action that 
triggers a transition, the API endpoint(s) invoked (from the API Collection Document), and the resulting screen or 
system state. Compliance-critical steps — principally the Schedule H/H1/X dispensing gate — are called out in a 
highlighted Compliance Gate box at the relevant point in the flow. 
1.4 Reference Documents 
BRD_IPMD_Platform_v1 Business goals, scope, roles, functional requirements 
TRD_IPMD_Platform_v1 System architecture, module-wise technical requirements 
API Collection (Doc 4) Endpoint-level contracts referenced throughout this flow 
Database Schema (Doc 3) Entity/state model each flow ultimately reads and writes 
UI/UX (Doc 6) Wireframes, design system, and accessibility annotations for each screen named here 
Integration Plan (Doc 7) Third-party (Razorpay/Firebase/SMS) credential and config plan 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 5 of 19 
2. App Flow Conventions 
● Screens are named consistently with their primary function (e.g., "Prescription Review", "Order Tracking") 
rather than a specific route path, since routing differs between web and Flutter. 
● Every API call referenced is documented in full in the API Collection Document (Doc 4) — this document 
shows only the endpoint and method, not the request/response schema. 
● Status polling screens (e.g., extraction status) represent either short-interval polling or a WebSocket-backed 
callback, per TRD Section 6.1 / Item 6 — the client-side mechanism is an implementation choice, the UX 
contract (status shown within 15–30s) is not. 
● A Compliance Gate callout marks any point in a flow where the system enforces a hard, non-bypassable 
business rule (principally the Schedule H/H1/X dispensing gate, TRD Item 17/34) — these gates are enforced 
server-side and cannot be bypassed by skipping a screen. 
● State-transition tables in Section 5 consolidate the lifecycle of the platform's core entities (prescription, 
order, payment, account) referenced across multiple role flows. 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 6 of 19 
3. Cross-Cutting Flow: Registration, Login & Session 
This flow is shared by all seven role types and is the entry point to every role-specific flow in Section 4. 
3.1 Registration & First Login 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Landing / Welcome User opens the app for the 
first time — 
Presents Register / Log In / Continue 
with Google / Continue with Apple 
options 
2 Role & Details Form 
Selects role (Patient auto-
selected on public signup; 
Doctor / Pharmacy Staff 
select explicitly) and enters 
name, email or phone, 
password 
POST /auth/register 
Patient → account status active, sent 
to OTP/Login. Doctor/Pharmacy Staff 
→ account status pending, sent to 
"Verification Pending" screen 
3 License Details 
(Doctor only) 
Enters medical 
license/registration number 
POST /auth/register 
(license_number) 
License format validated 
(LICENSE_FORMAT_INVALID on 
failure); account created in pending 
status 
4 
Pharmacy Details 
(Pharmacy Staff / 
Partner only) 
Enters pharmacy name, 
address, GSTIN 
POST /auth/register 
(pharmacy_details) 
Account created in pending status, 
queued for User Admin / Admin 
activation 
5 Verification Pending 
Doctor/Pharmacy Staff 
account awaits KYC / 
activation 
GET /users/me (polled 
or on relaunch) 
Screen remains until status = active 
(see Section 4.6/4.7); no token issued 
until then 
6 OTP Request Enters phone number to 
sign in POST /auth/otp/request 
6-digit OTP sent via SMS gateway 
(India DLT-compliant); 
otp_request_id returned 
7 OTP Verify Enters received OTP code POST /auth/otp/verify 
On success: access/refresh token pair 
issued, routed to role-specific Home 
screen 
8 Email/Password Login 
Enters registered email + 
password (alternative to 
OTP) 
POST /auth/login 
On success: access/refresh token pair 
issued, routed to role-specific Home 
screen 
9 OAuth Login Taps Continue with 
Google/Apple 
POST 
/auth/oauth/callback 
Creates a Patient account on first 
login if none exists (is_new_user = 
true); token pair issued 
3.2 Session Maintenance & Logout 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Any authenticated 
screen 
Access token nears/exceeds 
15-min TTL POST /auth/refresh 
New access/refresh pair issued 
silently; fails immediately if account 
was suspended 
(ACCOUNT_SUSPENDED) — user is 
force-logged-out to Landing 
2 Profile / Settings Taps "Log Out" POST /auth/logout Refresh token revoked; local session 
cleared; routed to Landing 
3 Profile / Settings 
Edits name, notification 
preferences, or saved 
addresses 
PATCH /users/me Confirmation toast; updated_fields 
reflected immediately 
Note: Role and status claims are re-validated server-side on every request (TRD Section 7.1) — a still-valid access token for a 
since-suspended account is rejected, not just hidden client-side. 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 7 of 19 
4. Role-Specific Flows 
4.1 Patient App Flow 
Implements BRD Patient Capabilities (Section 3.1) and FR-1 to FR-19. The Patient flow spans upload → AI 
interpretation → chat → catalog/order → payment → tracking. 
4.1.1 Patient Home 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Home Patient logs in 
GET /users/me, GET 
/notifications, GET 
/prescriptions, GET 
/orders 
Dashboard shows recent 
prescriptions/reports, active orders, 
unread notification count, and quick 
actions (Upload, Chat, Browse 
Catalog) 
4.1.2 Prescription / Report Upload & AI Interpretation 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Upload Picker 
Taps "Upload 
Prescription" or "Upload 
Report"; selects camera 
or file 
— Opens camera/file picker; client-
side size/type pre-check 
2 Uploading 
Confirms the 
captured/selected 
image or PDF 
POST /prescriptions/upload or 
POST /reports/upload 
File virus-scanned and stored 
immutably; 
prescription_id/report_id 
returned with status = queued 
3 Extraction Status 
(Processing) 
Waits on a progress 
screen 
GET /prescriptions/{id}/status 
(poll/WebSocket) 
progress_pct updates; target 15–
30s turnaround. On failed → 
"Upload Failed, Retry" screen 
4 Extraction Result 
— Prescription 
Views extracted fields 
with confidence 
indicators 
GET 
/prescriptions/{prescription_id} 
Each field shown with 
is_ai_generated disclosure; fields 
below threshold visibly marked 
needs_review, pending doctor 
confirmation 
4b Extraction Result 
— Report 
Views structured test 
values GET /reports/{report_id} 
Abnormal-flagged values shown 
with the AI plain-language 
explanation and is_ai_generated 
disclosure 
5 Awaiting Doctor 
Verification 
Prescription routed to 
doctor review (Section 
4.2) 
GET /prescriptions/{id}/status 
(poll for verification_status) 
Push/email/SMS notification 
sent on doctor_verified or 
rejected (Section 4.1.7) 
Note: Every AI-generated field carries a structured is_ai_generated flag per TRD Item 36 — the UI must render the non-
diagnostic disclosure consistently and cannot suppress it. 
4.1.3 AI Health Chat Assistant 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Chat Entry 
Taps "Ask AI 
Assistant" (optionally 
from a specific 
prescription) 
— If first use: routes to Consent 
screen 
2 Consent Accepts or declines 
chat-log persistence POST /chat/consent 
consent_record_id stored; 
declining still allows chat but 
disables message-history 
persistence 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 8 of 19 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
3 New Session Starts a conversation POST /chat/sessions 
session_id created, optionally 
linked to a prescription_id for 
grounded context 
4 Chat Thread Sends a message POST 
/chat/sessions/{session_id}/messages 
Reply rendered with 
is_ai_generated = true and a 
persistent non-diagnostic 
disclaimer. 
Diagnostic/emergency-
sounding queries trigger 
guardrail_triggered = true and a 
fixed doctor/emergency 
redirect instead of free-form 
generation 
5 Chat History Reopens a past 
session 
GET 
/chat/sessions/{session_id}/messages 
Message history shown only if 
consent was recorded 
6 Delete Session Taps "Delete this 
conversation" DELETE /chat/sessions/{session_id} 
Session purged ahead of the 
configured DPDP retention 
period 
4.1.4 Medicine Catalog, Matching & Cart 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Catalog Browse / 
Search 
Searches or browses 
medicines GET /catalog/medicines 
Paginated list with schedule 
badge (OTC/H/H1/X) and stock 
status 
2 Medicine Detail Taps a catalog item GET 
/catalog/medicines/{medicine_id} 
Shows owned/partner stock 
sources, price, and generic-
equivalent mapping 
3 Match from 
Prescription 
From an extraction 
result, taps "Add 
matched items to cart" 
POST /catalog/match 
Returns exact/generic/fuzzy 
matches with confidence; only 
auto_addable = true matches 
are offered for one-tap add — 
low-confidence matches surface 
as suggestions only 
4 Cart Creation Adds first item to cart POST /cart New cart_id created for the 
session 
5 Add to Cart Confirms quantity and 
adds an item POST /cart/{cart_id}/items 
Schedule H/H1/X items require a 
linked doctor_verified 
prescription_id, else added with 
checkout_blocked = true 
6 Cart Review Opens cart before 
checkout GET /cart/{cart_id} 
Shows subtotal and a per-item 
checkout_blocked indicator with 
an inline "Attach verified 
prescription" prompt where 
needed 
Compliance Gate: A cart containing any checkout_blocked item cannot proceed past Cart Review to Checkout. The patient is 
prompted to attach a doctor_verified prescription reference or remove the item. This is a UI -level convenience only — the 
same block is re-enforced, non-bypassably, at order creation (Section 4.1.5, step 2). 
4.1.5 Checkout & Payment 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Delivery Address Selects or adds a delivery 
address 
PATCH /users/me (if 
adding new) 
saved_addresses updated; address 
selected for this order 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 9 of 19 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
2 Place Order Confirms order 
POST /orders 
(Idempotency-Key 
required) 
On success: order_id and 
payment_required_amount returned, 
fulfillment_records created per line 
item. On 
PRESCRIPTION_NOT_VERIFIED: 
routed back to Cart Review with the 
blocking item highlighted 
3 Payment Method Selects card / UPI / 
netbanking / wallet 
POST /payments/orders 
(Idempotency-Key 
required) 
Server-side Razorpay order created; 
razorpay_order_id returned for client 
SDK initiation 
4 Razorpay Checkout 
(SDK) 
Completes payment in the 
Razorpay SDK sheet 
Razorpay Checkout SDK 
(external) 
SDK returns razorpay_payment_id 
and razorpay_signature to the client 
5 Payment 
Confirmation 
App submits the SDK result 
automatically 
POST /payments/capture 
(Idempotency-Key 
required) 
Server verifies signature against 
Razorpay Orders API; on captured → 
Order Confirmation screen. On failed 
→ "Payment Failed, Retry" screen, 
cart preserved 
6 Order Confirmation Views confirmation GET /orders/{order_id} 
Shows order status, line-item 
fulfillment sources, and estimated 
delivery 
Compliance Gate: Checkout service enforces the Schedule H/H1/X gate at the order -service layer, independent of and in 
addition to the Cart Review UI warning — a direct API call cannot bypass it (TRD Item 17/34). 
4.1.6 Order Tracking, History & Cancellation 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Order History Opens "My Orders" GET /orders Paginated list, filterable by status 
2 Order Detail / 
Tracking Taps an order GET /orders/{order_id} 
Shows live status (placed → 
processing → dispatched → 
delivered) per line item 
3 Cancel Order Taps "Cancel" (pre-
dispatch only) 
POST 
/orders/{order_id}/cancel 
Order/remaining line items 
cancelled; refund triggered 
automatically if payment was 
captured. Blocked with 
ORDER_ALREADY_DISPATCHED if 
past dispatch 
4 Refund Status Views refund on the order 
detail screen 
GET 
/payments/{payment_id} 
Shows processing / completed / 
failed refund status 
4.1.7 Notifications 
# Screen User Action / 
Trigger API Call(s) Result / Next Screen 
1 Notification 
Inbox Taps the bell icon GET /notifications 
List of 
order/verification/dispatch/delivery/refill/abnormal-
report notifications, unread-first 
2 Notification 
Preferences 
Toggles 
push/email/SMS in 
Settings 
PATCH 
/notifications/preferences 
Fan-out engine respects updated channel opt-ins on 
the next event 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 10 of 19 
4.2 Doctor App Flow 
Implements BRD Doctor Capabilities and FR-9 to FR-11. Available on web (primary review surface per TRD Section 4.3) 
and mobile (queue/notifications). 
4.2.1 Onboarding & KYC Wait 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Register (Doctor) Registers with 
license/registration number POST /auth/register Account created in pending status 
2 Verification Pending Sees "Awaiting license 
verification" screen GET /users/me 
Blocked from login/token issuance 
until User Admin approves (Section 
4.6.1) 
3 Activated Receives activation 
notification 
POST /auth/otp/verify 
or /auth/login 
Full token issuance now succeeds; 
routed to Verification Queue 
4.2.2 Verification Queue & Review 
# Screen User Action / 
Trigger API Call(s) Result / Next Screen 
1 Verification 
Queue 
Opens 
dashboard GET /verification/queue 
Lists assigned + on-call 
pool items, 
needs_review by 
default, with 
sla_breach indicator 
2 Prescription 
Review 
Opens a queue 
item GET /prescriptions/{prescription_id} 
Shows extracted fields 
with confidence 
scores and the source 
document image side-
by-side 
3a Approve Taps "Approve 
as-is" POST /verification/{prescription_id}/approve 
verification_status → 
doctor_verified; 
audit_log_id created; 
patient notified; item 
unblocks checkout 
3b Edit a Field 
Corrects an 
extracted value 
inline 
PATCH 
/prescriptions/{prescription_id}/fields/{field_id} 
review_state → 
doctor_edited; field 
updated in place, still 
requires an overall 
approve/reject action 
3c Reject 
Taps "Reject" 
and enters a 
mandatory 
reason 
POST /verification/{prescription_id}/reject 
verification_status → 
rejected; audit_log_id 
created; patient 
notified with reason; 
blocks dependent 
order flow 
4 Audit Log 
Opens 
"History" on a 
prescription 
GET /verification/{prescription_id}/audit-log 
Immutable, 
timestamped list of 
every verification 
action taken 
4.2.3 Report Access 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Patient Reports Opens a report a patient 
has granted access to 
GET 
/reports/{report_id} 
Shows structured values and AI plain-
language explanation for abnormal 
flags 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 11 of 19 
4.3 Pharmacy Staff (Owned) Flow 
Implements BRD Pharmacy Staff Capabilities. Web-primary operational surface. 
4.3.1 Fulfillment Queue & Dispatch 
# Screen User Action / 
Trigger API Call(s) Result / Next Screen 
1 Order Queue Opens dashboard GET /orders (routed to this staff 
member's queue) 
Lists orders/line items assigned 
to owned-inventory fulfillment 
2 Order Detail Opens an order GET /orders/{order_id} 
Shows line items, quantities, 
and Schedule H/H1/X 
compliance flag where 
applicable 
3 Compliance 
Check 
Reviews a flagged 
regulated item 
before pick/pack 
GET 
/verification/{prescription_id}/audit-
log (reference) 
Confirms doctor_verified status 
is present before dispensing; 
system already hard-blocked 
any unverified item at order 
creation 
4 Dispatch Marks item(s) 
dispatched 
(Fulfillment status update — internal 
to order/fulfillment service) 
fulfillment_records.status → 
dispatched; patient notified via 
Notifications module 
Note: Owned-inventory stock levels, batch, and expiry are managed through the same Admin -adjacent operational tooling 
described in TRD Section 4.4; a dedicated inventory-management endpoint set is defined alongside the Admin Panel APIs in 
the Integration Plan / future API revision. 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 12 of 19 
4.4 Partner Pharmacy Flow 
Implements the marketplace side of BRD's hybrid fulfillment model. 
4.4.1 Onboarding & Order Fulfillment 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Onboarding Request 
Registers as 
partner_pharmacy with 
pharmacy_details 
POST /auth/register Account created pending, reviewed 
by Admin (Section 4.5.2) 
2 Activated Admin onboards and 
activates the partner 
POST /auth/otp/verify 
or /auth/login 
Login succeeds once Admin has 
created the corresponding 
partner_pharmacies record and set 
status = active 
3 Order Queue Opens dashboard GET /orders (routed to 
this partner's queue) 
Lists orders/line items routed to this 
partner by the order-routing engine 
4 Order Fulfillment Confirms and dispatches an 
item GET /orders/{order_id} Status progression tracked the same 
as owned-inventory fulfillment 
5 Payout / Settlement Views settlement history 
(Payout ledger — 
reported via partner-
facing analytics, TRD 
Section 5) 
Reflects payout_ledger records net of 
platform commission 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 13 of 19 
4.5 Admin Panel Flow (Operations) 
Implements BRD FR-20 to FR-22. All screens gated by the admin role claim, enforced server-side (TRD Item 26). 
4.5.1 Operations Dashboard 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Dashboard Admin logs in GET 
/admin/dashboard/summary 
Shows orders today, SLA-breach 
count, doctor-verification queue 
depth, 30-day payment success rate 
4.5.2 Partner Pharmacy Management 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Partner List Opens "Partner 
Pharmacies" 
GET /admin/partner-
pharmacies 
Paginated list with status and 
fulfillment radius 
2 Onboard Partner Fills the onboarding form POST /admin/partner-
pharmacies 
New partner created with status = 
pending_activation 
3 Edit / Activate 
Partner 
Updates status or delivery 
radius 
PATCH /admin/partner-
pharmacies/{partner_id} 
Status updated; automatic 
temporary de-listing also occurs on 
stale-feed detection (TRD Risk 
Register) 
4.5.3 Dispute Resolution & Route Override 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Disputes List Opens "Disputes" GET 
/admin/orders/disputes 
Lists orders flagged for routing 
conflicts, stock discrepancies, or 
refund mismatches 
2 Route Override 
Selects a new fulfillment 
source for a line item with 
mandatory reason 
POST 
/orders/{order_id}/route-
override 
fulfillment source updated; 
audit_log_id created; justification 
persisted 
4.5.4 Doctor Verification Oversight 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Overdue Queue Opens "Verification SLA" 
GET 
/admin/verification-
queue/overdue 
Lists items exceeding the 12-hour 
median SLA target for 
escalation/reassignment 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 14 of 19 
4.6 User Admin Panel Flow 
Implements BRD FR-23 to FR-25. user_admin tokens are explicitly rejected on financial-configuration, inventory, and 
order-routing endpoints (TRD Item 29). 
4.6.1 Doctor KYC Verification 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Pending KYC 
Queue Opens "Doctor KYC" GET /user-admin/doctors/pending-
kyc 
Lists doctor accounts awaiting 
license verification 
2 Verify License Approves or rejects 
with reason 
POST /user-
admin/doctors/{doctor_id}/verify-
license 
On approve: account status → 
active, doctor can now log in. 
On reject: stays pending, 
reason recorded 
4.6.2 Account Management 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Account Search 
Searches/opens a 
patient, doctor, or 
pharmacy-staff account 
GET /users/{user_id} Shows profile and full 
status_history 
2 Suspend Suspends with a 
mandatory reason code 
POST /user-
admin/accounts/{user_id}/suspend 
status → suspended; token 
issuance blocked immediately 
(live status flag, not just token 
expiry) 
3 Reinstate Reinstates with a 
mandatory reason code 
POST /user-
admin/accounts/{user_id}/reinstate status → active 
4 Edit / Reassign 
Role 
Corrects profile fields or 
role 
PATCH /user-
admin/accounts/{user_id} 
Fields updated; audit_log_id 
created 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 15 of 19 
4.7 Super Admin Panel Flow 
Implements BRD FR-26 to FR-29. Only the super_admin role reaches these screens, via a dedicated, separately-
audited endpoint group (TRD Item 30). 
4.7.1 Admin & User Admin Account Management 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Admin Accounts 
List 
Opens "Admin 
Accounts" 
(list view backed by GET 
/users/{user_id} lookups) 
Shows existing Admin/User 
Admin accounts and 
permission sets 
2 
Create 
Admin/User 
Admin 
Fills the creation form 
with a granular 
permission set 
POST /super-admin/admins New account created; 
audit_log_id created 
3 Edit Permissions Updates the 
permission set 
PATCH /super-
admin/admins/{admin_id}/permissions 
Full replacement permission 
set applied; audit_log_id 
created 
4 Revoke Account 
Revokes an 
Admin/User Admin 
account 
DELETE /super-
admin/admins/{admin_id} 
status → revoked; 
audit_log_id created 
4.7.2 Platform Settings 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Settings Opens "Platform Settings" GET /super-
admin/settings 
Shows commission rate, masked 
credential reference, security policies 
2 Update Settings Edits commission rate / 
credentials / security policy 
PATCH /super-
admin/settings 
Changes versioned (config_version 
incremented); credential values 
never echoed back 
4.7.3 Compliance Overrides & Audit 
# Screen User Action / Trigger API Call(s) Result / Next Screen 
1 Compliance Override 
Overrides a blocked 
regulated order with 
mandatory justification 
POST /super-
admin/compliance-
overrides 
Order unblocked for this instance 
only; audit_log_id created; surfaced 
in the override report 
2 Audit Log Query 
Searches audit logs by actor 
role, action type, or date 
range 
GET /super-
admin/audit-logs 
Returns matching append-only 
entries across all three admin tiers 
plus verification and refund events 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 16 of 19 
5. Core State-Transition Models 
These lifecycles are referenced across multiple role flows in Section 4 and correspond to the status fields defined in 
the Database Schema Document (Doc 3). 
5.1 Prescription Lifecycle 
State Meaning Triggered By Possible Next State(s) 
queued Upload accepted, extraction job enqueued POST /prescriptions/upload processing 
processing OCR + Medical NLP extraction in progress Background worker pickup extracted, 
needs_review, failed 
extracted All fields at/above confidence threshold Extraction job completion pending_review 
(verification_status) 
needs_review One or more fields below confidence 
threshold Extraction job completion pending_review 
(verification_status) 
failed Extraction could not complete Extraction job error Terminal — user re-
uploads 
pending_review Awaiting doctor decision Routed to verification queue doctor_verified, 
rejected 
doctor_verified Approved by assigned/on-call doctor POST 
/verification/{id}/approve 
Terminal — unblocks 
regulated checkout 
rejected Rejected with mandatory reason POST /verification/{id}/reject Terminal — blocks 
dependent order flow 
5.2 Order Lifecycle 
State Meaning Triggered By Possible Next State(s) 
placed Order created from cart, payment not yet 
captured POST /orders processing, cancelled 
processing Payment captured, awaiting fulfillment POST /payments/capture 
(captured) dispatched, cancelled 
dispatched Item(s) handed to delivery Pharmacy/partner dispatch 
action delivered 
delivered Order delivered to patient Delivery confirmation Terminal 
cancelled Order or remaining items cancelled POST /orders/{id}/cancel 
(pre-dispatch only) 
Terminal — triggers 
refund flow if 
captured 
5.3 Payment Lifecycle 
State Meaning Triggered By Possible Next State(s) 
created Server-side Razorpay order created POST /payments/orders captured, failed 
captured Client payment confirmed and signature-
verified POST /payments/capture refunded, 
partially_refunded 
failed Signature verification failed or payment 
declined 
POST /payments/capture 
(failed) / Razorpay webhook 
Terminal — order 
remains placed, 
patient retries 
refunded Full amount refunded POST /payments/refunds Terminal 
partially_refunded Partial amount refunded POST /payments/refunds 
(partial) 
refunded (on 
subsequent full 
refund) 
5.4 Account Status Lifecycle 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 17 of 19 
State Meaning Triggered By Possible Next State(s) 
pending Doctor/Pharmacy Staff/Partner registered, 
awaiting KYC or activation POST /auth/register 
active (approved), 
pending (rejected, 
stays) 
active Account can authenticate and use role-
scoped features 
License approval / User 
Admin activation / default for 
Patients 
suspended 
suspended Account blocked from token issuance and 
refresh 
POST /user-
admin/accounts/{id}/suspend active (reinstated) 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 18 of 19 
6. Screen Inventory by Role 
Consolidated list of every named screen in Section 4, for cross-reference against the UI/UX Document (Doc 6) 
wireframe set. 
Role Screens 
Patient 
Home, Upload Picker, Extraction Status, Extraction Result (Prescription/Report), Chat Consent, Chat 
Thread, Chat History, Catalog Browse, Medicine Detail, Cart Review, Delivery Address, Payment 
Method, Order Confirmation, Order History, Order Detail/Tracking, Notification Inbox, 
Profile/Settings 
Doctor Verification Pending, Verification Queue, Prescription Review, Audit Log, Patient Reports 
Pharmacy Staff (Owned) Order Queue, Order Detail, Compliance Check, Dispatch 
Partner Pharmacy Onboarding Request, Order Queue, Order Fulfillment, Payout/Settlement 
Admin Dashboard, Partner List, Onboard Partner, Disputes List, Route Override, Overdue Verification 
Queue 
User Admin Pending KYC Queue, Account Search, Account Detail, Suspend/Reinstate 
Super Admin Admin Accounts List, Create Admin/User Admin, Edit Permissions, Platform Settings, Compliance 
Override, Audit Log Query 
 
Note: Screen names here are functional labels for flow-mapping purposes. Final screen titles, layout, and component 
composition are defined in the UI/UX Document (Doc 6). 
 

I.P. & M.D Platform — App Flow Document 
App Flow Document v1.0 — Draft   |   Page 19 of 19 
7. Glossary 
Term Definition 
Flow A named sequence of screens and system responses that accomplishes one user goal (e.g., "Checkout 
& Payment"). 
Compliance Gate A hard, server-enforced business rule that blocks progress in a flow regardless of UI state (e.g., 
Schedule H/H1/X verification). 
State Transition A change in an entity's status field (prescription, order, payment, account) triggered by a specific API 
action. 
Guardrail (Chat) The fixed disclaimer/redirect response path used instead of free-form LLM generation for diagnostic 
or emergency-sounding queries. 
Idempotency Key A client-supplied unique key ensuring a retried request (order, payment) is not processed twice. 
Schedule H/H1/X Categories of drugs under Indian law requiring a valid, verified prescription to dispense. 
Note: This App Flow Document is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0), 
TRD_IPMD_Platform_v1 (v1.0), API_Collection_IPMD_Platform_v1 (v1.0), and the Database Schema Document (v1.0). Any 
scope changes identified during flow design should be reflected back into those documents first, then propagated to this 
document and the remaining companions (UI/UX, Integration Plan).  


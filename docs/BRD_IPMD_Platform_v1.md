I.P. & M.D Platform — Business Requirement Document 
Page 1 of 12 
I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
BUSINESS REQUIREMENT DOCUMENT (BRD) 
Version 1.0  |  Draft for Review 
Prepared: July 2026 
Document 1 of 7  —  Project Documentation Suite 
 

I.P. & M.D Platform — Business Requirement Document 
Page 2 of 12 
Document Control 
Field Detail 
Document Title Business Requirement Document (BRD) — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Stakeholder Review 
Prepared Date July 2026 
Related Documents TRD, API Collection, Database Schema, App Flow, UI/UX, Integration 
Plan 
 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft Product/Business 
Team 
 

I.P. & M.D Platform — Business Requirement Document 
Page 3 of 12 
1. Executive Summary 
The I.P. & M.D Platform (Intelligent Prescription & Medicine Discovery Platform) is an AI-powered 
digital health platform that allows patients to upload medical prescriptions and diagnostic reports (blood 
reports, sonography, CT scans, and similar) so the system can interpret them, verify authenticity where 
relevant, and recommend or dispense matching medicines. The platform combines an AI comprehension 
layer (OCR + medical NLP) with an e-commerce and payment layer, connecting patients, verifying 
doctors, and a hybrid pharmacy network (in-house inventory plus partner pharmacies). 
This document defines the business goals, scope, user roles, functional requirements, constraints, and 
success criteria for Version 1 (V1) of the platform, with India as the initial launch market and 
international expansion planned for a later phase. 
1.1 Problem Statement 
• Patients often struggle to read, understand, or correctly act on handwritten or complex prescriptions 
and diagnostic reports. 
• Finding the correct medicine (brand, generic equivalent, or substitute) that matches a prescription is 
time-consuming and error-prone, especially across multiple pharmacies. 
• There is no single trusted platform in the target market that combines AI-based report interpretation, 
doctor-backed verification, and direct, compliant medicine fulfillment. 
• Patients frequently have follow-up health questions after receiving a prescription/report but lack an 
easy, low-friction way to get preliminary guidance without booking another consultation. 
1.2 Proposed Solution 
A three-sided platform serving Patients, Doctors, and Pharmacy/Admin staff, where: 
• Patients upload prescriptions/reports, receive AI-generated interpretations, chat with an AI assistant 
for health-related queries, and order medicines directly through the app. 
• Doctors can review, verify, digitally endorse, or correct AI-extracted prescription data, lending 
clinical trust to the AI output. 
• Pharmacy/Admin staff manage inventory (owned warehouse stock and partner pharmacy stock), 
fulfil orders, and oversee compliance checks for regulated medicines. 
 
2. Business Objectives 
# Objective Success Indicator 
1 Reduce time from prescription/report upload to correct 
medicine delivery 
Median time from upload to order placement < 5 
minutes 

I.P. & M.D Platform — Business Requirement Document 
Page 4 of 12 
# Objective Success Indicator 
2 Increase trust in AI-extracted medical data via doctor 
verification 
≥ 90% of AI-flagged prescriptions reviewed 
within 12 hours 
3 Build a scalable hybrid fulfillment network ≥ 500 partner pharmacies onboarded in Year 1 
(India) 
4 Establish a reliable revenue stream via medicine sales 
& platform commission 
Positive contribution margin per order by Month 
9 
5 Prepare the architecture for international expansion Platform supports multi-region/multi-
currency/multi-language config by V2 
 
3. Scope 
3.1 In-Scope (V1 — India Launch) 
Patient Capabilities 
• Register/login (email, phone/OTP, or OAuth) 
• Upload prescriptions and diagnostic reports (image/PDF) 
• Receive AI-generated extraction: medicines, dosage, frequency, duration 
• Receive AI flagging of abnormal report values (e.g., high glucose, abnormal liver markers) with 
plain-language explanation 
• Receive AI-suggested OTC alternatives / generic equivalents where clinically and legally appropriate 
• Chat with an AI health assistant for general, non-diagnostic health queries 
• Search, browse, and order medicines; track order status 
• Make payments via Razorpay (cards, UPI, netbanking, wallets) 
• Receive notifications (push, email, SMS) for order status, refill reminders, doctor feedback 
• View order history, re-order, manage saved addresses and prescriptions 
Doctor Capabilities 
• Register with medical license/registration number for verification 
• Review AI-extracted prescription data linked to their patients and approve/correct it 
• View patient-uploaded reports they've been granted access to, with AI summary 
• Digitally endorse a prescription so regulated medicines can be dispensed against it 
Pharmacy Staff Capabilities 
• Manage owned-warehouse inventory (stock levels, batch/expiry tracking, pricing) 
• Process and dispatch orders routed to owned inventory 

I.P. & M.D Platform — Business Requirement Document 
Page 5 of 12 
• Flag orders containing Schedule H / H1 / X (India) or otherwise regulated medicines for compliance 
checks 
Admin Panel Capabilities (Operations Admin) 
• Onboard and manage partner pharmacies, including their catalog and fulfillment radius 
• Route orders to owned inventory or nearest capable partner pharmacy; resolve order disputes 
• Oversee doctor verification queue and turnaround SLAs 
• View operational analytics: orders, inventory turnover, fulfillment performance 
User Admin Panel Capabilities 
• Verify doctor medical license/registration numbers (KYC) before activating doctor accounts 
• Manage patient, doctor, and pharmacy-staff accounts: edit, suspend, reinstate 
• Assign/change user roles and handle support tickets/escalations 
Super Admin Panel Capabilities 
• Create, edit, and revoke Admin and User Admin accounts and their permissions 
• Configure platform-wide settings: commission rates, payment gateway keys, security policies 
• Final authority on compliance overrides; access full financial and platform-wide analytics 
• Review audit logs across all admin tiers 
Platform-wide 
• AI OCR + Medical NLP pipeline for prescriptions and reports 
• AI chat assistant (LangChain + LLM provider) 
• Payment gateway integration (Razorpay) 
• Notification system (Firebase Push + Email + SMS) 
• Web app (React + Next.js) and mobile app (Flutter) with shared backend (FastAPI) 
3.2 Out of Scope (V1) 
• Live video/audio doctor teleconsultation (may be considered for V2) 
• Insurance claim processing / integration 
• International payment currencies and multi-language localization (planned for expansion phase) 
• Home sample collection for diagnostic tests (lab-side logistics) 
• AI-based definitive diagnosis — the AI provides informational interpretation only, never a diagnosis 
(see Section 7, Compliance). 
 

I.P. & M.D Platform — Business Requirement Document 
Page 6 of 12 
4. Stakeholders & User Roles 
Role Description Key Needs 
Patient End consumer uploading 
prescriptions/reports and ordering 
medicines 
Speed, accuracy, trust, affordability, 
privacy 
Doctor Verifies/endorses AI-extracted 
prescriptions; reviews reports 
Low-friction review UI, clinical 
accuracy, liability protection 
Pharmacy Staff (Owned) Manages in-house inventory & 
fulfillment 
Clear order queue, inventory alerts, 
compliance tooling 
Partner Pharmacy External pharmacy fulfilling orders via 
marketplace model 
Fair commission, simple onboarding, 
timely payouts 
Super Admin Highest platform authority; controls 
system configuration, admin accounts, 
and final compliance sign-off 
Full system control, security 
oversight, audit trails 
Admin (Operations) Manages day-to-day platform operations: 
pharmacies, inventory, orders, doctor 
queue 
Operational dashboards, escalation 
tools, SLA visibility 
User Admin Manages individual user accounts across 
all roles (patients, doctors, pharmacy 
staff) 
KYC/verification tools, account 
controls, support workflows 
Business/Investors Funds and evaluates platform 
performance 
Growth metrics, unit economics, 
regulatory risk visibility 
 
4.1 Admin Panel Tiers — Roles & Access 
The platform's back-office is split into three tiers so that system-level control, operational management, 
and user-account administration remain cleanly separated — this limits blast radius if any single admin 
account is compromised and keeps an audit trail per tier. 
Tier Scope of Control Cannot Do 
Super Admin Panel Create/revoke Admin & User Admin accounts; 
system & security configuration; 
financial/commission settings; final compliance 
overrides; full analytics 
N/A — highest authority, but every 
action is audit-logged 
Admin Panel Partner pharmacy onboarding & catalog 
management; inventory oversight; order routing 
& dispute resolution; doctor verification queue 
oversight; operational analytics 
Cannot create other Admin/Super 
Admin accounts; cannot change 
system-wide security or commission 
config 
User Admin Panel Doctor license/KYC verification; 
patient/doctor/pharmacy-staff account 
management (suspend, reinstate, edit); role 
assignment; support ticket handling 
Cannot access financial 
configuration, inventory, or order-
routing settings 

I.P. & M.D Platform — Business Requirement Document 
Page 7 of 12 
 
5. Functional Requirements by Module 
5.1 Prescription & Report Intake 
1. System shall allow upload of images (JPG/PNG) and PDFs up to a configurable size limit. 
2. System shall run OCR to extract raw text from the uploaded document. 
3. System shall run Medical NLP to structure extracted text into: medicine name, strength, dosage, 
frequency, duration, prescribing doctor, date; and for reports: test name, value, unit, reference range, 
flag (normal/abnormal). 
4. System shall assign a confidence score to each extracted field; low-confidence fields shall be routed 
for doctor or admin review before being acted upon. 
5. System shall never auto-dispense a Schedule H/H1/X (or regionally equivalent controlled) medicine 
without a valid, verified, linked prescription. 
5.2 AI Health Chat Assistant 
6. System shall provide a conversational assistant for general health questions, medicine information, 
and platform navigation help. 
7. System shall clearly disclose that the assistant does not provide medical diagnosis and shall direct 
users to a doctor for diagnostic or emergency concerns. 
8. System shall log chat interactions (with consent) for quality review and model improvement. 
5.3 Doctor Verification Workflow 
9. System shall route AI-extracted prescriptions to the linked/assigned doctor (or an on-call verifying 
doctor pool) for confirmation. 
10. Doctor shall be able to approve as-is, edit fields, or reject with a reason. 
11. System shall timestamp and store an immutable audit record of every verification action. 
5.4 Medicine Catalog & Ordering 
12. System shall maintain a unified catalog merging owned-inventory SKUs and partner-pharmacy 
SKUs, de-duplicated by standard medicine identifiers. 
13. System shall match prescription line items to catalog SKUs and suggest substitutable generics where 
permitted. 
14. System shall route each order item to the fulfillment source (owned warehouse or nearest partner 
pharmacy) based on stock, price, and delivery SLA. 
15. System shall block checkout on regulated items until a valid verified prescription is attached. 
5.5 Payments 

I.P. & M.D Platform — Business Requirement Document 
Page 8 of 12 
16. System shall integrate Razorpay for card, UPI, netbanking, and wallet payments. 
17. System shall support order-level and split-fulfillment payment capture (e.g., partial shipment from 
partner pharmacy). 
18. System shall handle refunds for cancelled/returned/out-of-stock items. 
5.6 Notifications 
19. System shall send push (Firebase), email, and SMS notifications for: order confirmation, doctor 
verification result, dispatch, delivery, refill reminders, and abnormal report flags. 
5.7 Admin Panel (Operations) 
20. System shall provide an operations dashboard for inventory oversight, order routing, partner 
pharmacy onboarding, and dispute resolution. 
21. System shall let Admins oversee the doctor verification queue and escalate overdue reviews. 
22. System shall restrict Admins from creating other Admin/Super Admin accounts or changing system-
wide security/commission settings. 
5.8 User Admin Panel 
23. System shall let User Admins verify doctor medical license/registration numbers before a doctor 
account is activated. 
24. System shall let User Admins suspend, reinstate, or edit patient, doctor, and pharmacy-staff accounts, 
with reason codes logged. 
25. System shall restrict User Admins from accessing financial configuration, inventory, or order-routing 
settings. 
5.9 Super Admin Panel 
26. System shall let Super Admins create, edit, and revoke Admin and User Admin accounts and assign 
granular permissions. 
27. System shall let Super Admins configure platform-wide settings: commission rates, payment 
gateway credentials, and security policies. 
28. System shall give Super Admins final authority to override a compliance block (e.g., an edge-case 
regulated order), with mandatory justification captured in the audit log. 
29. System shall maintain immutable audit logs across all three admin tiers, sufficient to demonstrate 
regulatory compliance on request. 
 

I.P. & M.D Platform — Business Requirement Document 
Page 9 of 12 
6. Business-Level Non-Functional Requirements 
Category Requirement 
Availability Platform should target 99.5%+ uptime for ordering & payment paths 
Data Privacy Health data must be encrypted at rest & in transit; access restricted by role  
Performance AI extraction result returned within 15–30 seconds for a typical document 
Auditability All doctor verifications & regulated-medicine dispensing must be traceable 
Scalability Architecture must support scaling from India-only to multi-region 
Accessibility Mobile and web UI should support basic accessibility standards (WCAG AA 
target) 
 
7. Regulatory & Compliance Considerations (India Launch) 
This platform operates at the intersection of healthcare and e-commerce, which is a regulated space in 
India. This section is informational and directional — final legal sign-off should come from qualified 
legal/regulatory counsel before launch. 
• Sale of Schedule H, H1, and X drugs requires a valid prescription per the Drugs and Cosmetics 
Act/Rules; the platform must not permit checkout on these without doctor-verified prescription 
linkage. 
• Handling of personal and health data should align with India's Digital Personal Data Protection 
(DPDP) Act, including purpose limitation, consent, and data retention controls. 
• AI-generated interpretations must be clearly labeled as informational/non-diagnostic; final clinical 
decisions must remain with a licensed doctor. 
• Telemedicine-adjacent doctor interactions (verification/endorsement) should align with applicable 
Telemedicine Practice Guidelines. 
• Data localization requirements for health data should be reviewed prior to choosing cloud hosting 
regions. 
• International expansion will require a jurisdiction-by-jurisdiction compliance review (e.g., data 
protection, pharmacy licensing) before launch in each new market. 
 

I.P. & M.D Platform — Business Requirement Document 
Page 10 of 12 
8. Assumptions & Constraints 
8.1 Assumptions 
• Partner pharmacies will have digital catalog/inventory feeds or will be onboarded onto a platform-
provided inventory tool. 
• A pool of licensed doctors will be available (in-house or contracted) to handle verification volume. 
• Users have smartphone/internet access sufficient to upload photos of prescriptions/reports. 
8.2 Constraints 
• V1 is limited to the Indian market and Indian regulatory framework. 
• AI cannot be relied upon as the sole authority for dispensing controlled medicines — doctor 
verification is mandatory in the loop. 
• Budget/timeline for V1 assumed to prioritize core flows (upload → verify → order → pay) over 
secondary features (e.g., teleconsultation). 
 
9. Success Metrics (KPIs) 
KPI Target (Year 1) 
Monthly Active Users (Patients) Defined post market-sizing exercise 
Prescription-to-Order Conversion Rate ≥ 40% 
Doctor Verification Turnaround Time ≤ 12 hours median 
Order Fulfillment SLA (metro areas) ≤ 24 hours 
AI Extraction Accuracy (field-level) ≥ 95% on clear, typed prescriptions; tracked 
separately for handwritten 
Partner Pharmacy Network Size ≥ 500 pharmacies 
Payment Success Rate ≥ 98% 
 
10. Key Risks 
Risk Impact Mitigation 
Misinterpretation of handwritten 
prescriptions by OCR/NLP 
High Mandatory doctor verification loop; 
confidence-based routing 
Regulatory non-compliance in 
medicine dispensing 
High Legal review; hard system blocks on regulated 
SKUs without verification 

I.P. & M.D Platform — Business Requirement Document 
Page 11 of 12 
Risk Impact Mitigation 
Partner pharmacy stock/quality 
inconsistency 
Medium SLA agreements, ratings, and compliance 
audits 
AI chat giving unsafe health 
guidance 
High Strict scope-limiting prompts, disclaimers, 
escalation to doctor/emergency resources 
Payment/refund disputes on 
cancelled regulated orders 
Medium Clear refund policy; automated reconciliation 
with Razorpay 
 

I.P. & M.D Platform — Business Requirement Document 
Page 12 of 12 
11. High-Level Roadmap 
Phase Focus Approx. Timeline 
Phase 1 (V1) India launch: core upload→verify→order→pay flow, 
owned + partner inventory 
Months 0–6 
Phase 2 Teleconsultation, refill automation, expanded AI chat, 
loyalty/subscriptions 
Months 6–12 
Phase 3 International expansion: localization, multi-currency, 
region-specific compliance 
Month 12+ 
 
12. Glossary 
Term Definition 
OCR Optical Character Recognition — extracting raw text from images/PDFs 
Medical NLP Natural Language Processing tuned to structure medical text (medicines, dosages, 
lab values) 
Schedule H/H1/X Categories of drugs under Indian law requiring a valid prescription to dispense  
SKU Stock Keeping Unit — a unique identifier for a sellable medicine/product 
DPDP Act Digital Personal Data Protection Act (India, 2023) 
Hybrid Fulfillment Order fulfillment sourced from either owned warehouse stock or partner pharmacy 
stock 
 
This BRD is the foundation for the Technical Requirement Document (TRD), Database Schema, API 
Collection, App Flow, UI/UX, and Integration Plan documents that follow in this suite. Any scope 
changes made after stakeholder review should be reflected back into this document first. 


I.P. & M.D PLATFORM 
Intelligent Prescription & Medicine Discovery Platform 
UI/UX DESIGN DOCUMENT 
Version 1.0  |  Draft for Review 
Prepared: July 2026 
Document 6 of 7 — Project Documentation Suite 

Document Control 
Field Detail 
Document Title UI/UX Design Document — I.P. & M.D Platform 
Version 1.0 
Status Draft — Pending Design & Stakeholder Review 
Prepared Date July 2026 
Derived From 
BRD_IPMD_Platform_v1 (v1.0), TRD_IPMD_Platform_v1 (v1.0), Database Schema 
Document (v1.0), API_Collection_IPMD_Platform_v1 (v1.0), 
App_Flow_Document_IPMD_Platform_v1 (v1.0) 
Related Documents BRD, TRD, Database Schema, API Collection, App Flow, Integration Plan 
 
Revision History 
Version Date Description Author 
1.0 July 2026 Initial draft, derived from BRD v1.0, TRD v1.0, Database Schema, API 
Collection v1.0, and App Flow v1.0 Product/Design Team 
 

Table of Contents 
1.  Introduction ................................................................................................................................................ 3 
2.  Design Philosophy & Principles ................................................................................................................... 4 
3.  Design System (Foundations) ...................................................................................................................... 5 
4.  Information Architecture by Role ............................................................................................................. 10 
5.  Cross-Cutting UI Patterns .......................................................................................................................... 13 
6.  Screen-by-Screen Wireframe Specifications ............................................................................................. 16 
7.  Responsive & Platform Behavior (Web vs. Flutter) .................................................................................. 24 
8.  Accessibility Compliance Summary (WCAG AA) ....................................................................................... 25 
9.  Screen Inventory Cross-Reference ............................................................................................................ 26 
10.  Glossary ................................................................................................................................................... 27 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 4 of 22 
1. Introduction 
1.1 Purpose 
This UI/UX Design Document defines the visual design system, information architecture, interaction patterns, 
and screen-level wireframe specifications for Version 1 (V1) of the I.P. & M.D Platform. It translates the 
functional scope defined in the Business Requirement Document (Doc 1), the screen sequencing defined in 
the App Flow Document (Doc 5), the entity/state model defined in the Database Schema Document (Doc 3), 
and the technical constraints defined in the Technical Requirement Document (Doc 2) into a concrete, 
buildable design specification for both the web application (React + Next.js) and the mobile application 
(Flutter). 
1.2 Scope of This Document 
This document covers: the shared design system (color, typography, spacing, components), the information 
architecture for each of the platform's seven role types, cross-cutting interaction patterns unique to a 
regulated health-commerce product (AI-disclosure, confidence indicators, compliance gates), and screen-by-
screen wireframe specifications for every screen named in the App Flow Document's Screen Inventory 
(Section 6). It does not restate API request/response schemas (API Collection, Doc 4) or backend state-
transition logic (App Flow, Doc 5, Section 5) beyond what is needed to specify how each state should be 
communicated visually. 
1.3 How to Read This Document 
Section 3 should be treated as the source of truth for any visual token (color, spacing, type scale) referenced 
elsewhere in this document or implemented in code. Section 6 wireframe specifications are written as layout 
+ component + state tables rather than pixel-perfect mockups, so that the same specification can be 
implemented consistently in both React/Next.js and Flutter. Every screen specification includes an explicit 
Accessibility/Compliance Notes column — these are not optional polish items but hard requirements carried 
forward from BRD Section 6 (NFRs) and BRD Section 7 (Regulatory Considerations). 
1.4 Reference Documents 
Document What This Document Draws From It 
BRD_IPMD_Platform_v1 Business goals, in/out-of-scope capabilities, user roles, compliance and NFR 
requirements 
TRD_IPMD_Platform_v1 Client technology stack (React/Next.js, Flutter), shared design-token architecture, 
WCAG AA target 
Database Schema Document Entity fields and status enums that must be surfaced in the UI (e.g., 
verification_status, schedule class, fulfillment source) 
API Collection Document Endpoint-level error codes surfaced as UI error states (e.g., 
PRESCRIPTION_NOT_VERIFIED, ACCOUNT_SUSPENDED) 

I.P. & M.D Platform — UI/UX Design Document 
Page 5 of 22 
App Flow Document Screen sequencing, state-transition models, and the canonical Screen Inventory this 
document designs against 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 6 of 22 
2. Design Philosophy & Principles 
The I.P. & M.D Platform sits at the intersection of AI, e-commerce, and regulated healthcare. The design 
language must earn trust quickly, communicate uncertainty and compliance honestly, and stay calm under 
the weight of medical content. Five principles govern every screen in this document: 
2.1 Guiding Principles 
Principle What It Means in Practice 
Trust & Clarity First Clinical, uncluttered layouts with generous whitespace; no dark patterns; every AI-
generated statement is visually distinct from doctor-verified or system-of-record data. 
Compliance Is Not a Modal, It's 
a Pattern 
The Schedule H/H1/X compliance gate (BRD Section 7) is rendered as a persistent, 
unmissable inline state — never a dismissible popup a patient can accidentally click 
past. 
Calm Efficiency 
Health tasks (checking a report, verifying a prescription) are often done under stress 
or time pressure. Primary actions are always one tap/click away; secondary and 
destructive actions are visually subordinate. 
Inclusive by Default WCAG AA contrast, semantic markup, and legible type sizes are baseline 
requirements, not a later accessibility pass — carried forward from BRD Section 6. 
One Design Language, Two 
Platforms 
Web (React/Next.js) and mobile (Flutter) share a single token spec (TRD Section 3.1) 
so a patient or doctor moving between them never has to re-learn the interface. 
2.2 Content & Tone Principles 
• Plain language over clinical jargon wherever a lay reader is the audience (patient-facing report 
explanations); clinical precision preserved wherever a doctor is the audience. 
• Every AI-generated interpretation is labeled, never implied to be a diagnosis — per BRD Section 7 and 
TRD Item 36 (is_ai_generated flag). 
• Errors are written as next steps, not blame (e.g., "This item needs a verified prescription" rather than 
"Invalid request"). 
• Regulatory and financial actions (compliance override, refund, account suspension) always require a 
stated reason, and that reason is shown back to the user, not just logged silently. 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 7 of 22 
3. Design System (Foundations) 
These tokens are the shared source referenced by TRD Section 3.1 ("Shared token-based theme"). They are 
implemented as a platform-agnostic token spec (JSON/YAML) consumed by both the React/Next.js Tailwind-
equivalent theme and the Flutter ThemeData. 
3.1 Color Palette 
Primary palette: a deep clinical teal signals trust, calm, and health without leaning on the generic "medical 
blue" or alarming red. Semantic colors are reserved exclusively for their meaning and never reused 
decoratively — this is critical in a product where color communicates compliance state. 
Primary & Neutral 
Token Hex Swatch Usage 
Teal / Primary #0F6E6E  Primary buttons, active nav, links, brand accents 
Teal / Dark #0A4F4F  Header bars, pressed states, high-emphasis text on light bg 
Teal / Light #E6F3F3  Selected-row backgrounds, info card backgrounds 
Ink (Text) #1C2B2E  Primary body/heading text 
Slate (Secondary 
Text) #44555A  Secondary text, captions, timestamps 
Mist (Surface) #F4F7F7  App background, card surfaces on web 
Line (Border) #D8E2E2  Dividers, input borders, table gridlines 
Semantic Colors 
Token Hex Swatch Usage 
Success #1E8E5A  doctor_verified, delivered, payment captured, approved 
states 
Warning #B8790A  needs_review, pending, sla_breach approaching, low stock 
Danger #C43D3D  rejected, failed, checkout_blocked, suspended, compliance 
gate 
Info #2464A8  is_ai_generated disclosure, informational banners, non-
diagnostic notices 
Medicine Schedule Badges (Regulatory) 
These four colors are reserved exclusively for the medicine schedule badge shown on every catalog, cart, and 
order line item (per BRD Section 7 / App Flow 4.1.4) and must never be reused for any non-regulatory 
purpose, since patients learn to read them as a compliance signal. 
Token Hex Swatch Usage 
Schedule: OTC #1E8E5A  Over-the-counter — no prescription required 

I.P. & M.D Platform — UI/UX Design Document 
Page 8 of 22 
Schedule: H #B8790A  Requires a valid prescription 
Schedule: H1 #D9631E  Requires a valid, verified prescription + stricter tracking 
Schedule: X #C43D3D  Highest-control category — verified prescription mandatory, 
no substitution 
3.2 Typography 
Style Font / Weight Size Usage 
Display Inter / Poppins, Bold (700) 28–32px Marketing/landing headline only 
H1 Inter, SemiBold (600) 24px Screen titles 
H2 Inter, SemiBold (600) 19px Section headers within a screen 
H3 / Label-strong Inter, Medium (500) 16px Card titles, table headers 
Body Inter, Regular (400) 15px Default body copy, form values 
Body Small / Caption Inter, Regular (400) 13px Timestamps, helper text, disclaimers 
Numeric / Tabular Inter, Tabular Figures 15px 
Prices, dosage numbers, order totals 
— always tabular figures so columns 
align 
Minimum body text size is 15px (≈0.9375rem) on web and 14sp on Flutter to meet WCAG AA legibility guidance for a health-
literacy-sensitive audience; the product never drops below this for primary content. 
3.3 Spacing & Grid System 
• Base spacing unit: 4px. Component padding and gaps are multiples of this unit (8, 12, 16, 24, 32, 48). 
• Web grid: 12-column responsive grid, 24px gutter, max content width 1200px for dashboards, 720px for 
reading-focused screens (chat, extraction results). 
• Mobile (Flutter): single-column layout with 16px horizontal margins; card-based composition throughout, 
matching the web card metaphor. 
• Touch targets: minimum 44×44px on mobile per platform accessibility guidelines; 40×40px minimum on 
web for mouse/touch-hybrid devices. 
3.4 Iconography & Imagery 
• Icon set: single consistent line-icon family (24px grid, 1.5px stroke) shared across web and Flutter — 
avoids mixing filled/outlined styles that read as inconsistent trust signals. 
• Medical iconography (pill, syringe, report/document, stethoscope) reserved for empty states and 
category markers only, never as decorative filler that could be mistaken for clinical guidance. 
• Photography, where used (partner pharmacy listings, medicine packaging), is real product/venue 
photography — no stock imagery of unrelated "doctors" that could imply a specific doctor endorsement. 
3.5 Elevation, Radius & Motion 
Token Specification 

I.P. & M.D Platform — UI/UX Design Document 
Page 9 of 22 
Corner Radius 8px for cards/inputs, 6px for buttons/badges, 999px (pill) for status chips and schedule 
badges 
Elevation 3-level shadow scale: Level 0 (flat, default cards), Level 1 (dropdowns/menus), Level 2 
(modals/sheets) — no more than 2 elevation jumps visible on one screen 
Motion 
150–200ms ease-out for state transitions (e.g., extraction status progress); no motion 
is required to convey a status change — color/icon/text always carry the meaning 
redundantly for reduced-motion users 
3.6 Core Components 
Component Specification Notes 
Primary / Secondary Button 
Primary: solid teal fill, white text, 6px radius. Secondary: teal outline, teal text. 
Destructive (e.g., Cancel Order, Revoke Account): danger-outline, requires confirmation 
step. 
Status Badge / Chip 
Pill-shaped, semantic color background at 12% opacity with full-opacity text/icon of the 
same hue — used for order/prescription/payment/account lifecycle states listed in App 
Flow Section 5. 
Schedule Badge Small pill badge (OTC/H/H1/X) always paired with a text label, never color alone, to 
satisfy color-blind accessibility. 
Confidence Indicator 
Three-tier visual (High / Needs Review / Low) shown as a colored dot + label next to 
every AI-extracted field, never as a bare numeric percentage to a patient (doctors see 
the underlying score on hover/expand). 
AI Disclosure Banner Persistent, non-dismissible inline banner/inline tag reading "AI-generated · Not a 
diagnosis" wherever is_ai_generated = true, per TRD Item 36. 
Compliance Gate Banner Full-width danger-toned inline banner (not a modal) at Cart Review / Checkout 
explaining exactly which item is blocked and the one action needed to unblock it. 
Lifecycle Stepper Horizontal (web) / vertical (mobile) stepper used for Order Tracking and Prescription 
Lifecycle, mapped directly to the state tables in App Flow Section 5. 
Data Table Used across all three admin tiers; supports column sort, status-badge cells, and row-level 
actions; paginated via cursor per Database Schema Section 5.2. 
Form Input / Select / OTP 
Input 
Consistent 1px border (Line token), 8px radius, error state uses Danger border + inline 
helper text directly under the field (never a toast-only error for form validation). 
Toast / Inline Confirmation 
Toasts used for lightweight confirmations (e.g., profile saved); anything affecting money, 
compliance, or account status uses an inline confirmation, never a toast alone, since 
toasts are easy to miss. 
Modal / Bottom Sheet Reserved for focused, single-decision interactions (e.g., Reject Prescription reason entry, 
Suspend Account reason entry) — never used for the compliance gate itself. 
3.7 Accessibility Standards (WCAG AA Baseline) 
• Minimum contrast ratio 4.5:1 for body text, 3:1 for large text/icons — verified against every token pairing 
in Section 3.1. 
• All interactive elements reachable and operable via keyboard (web) and screen reader 
(VoiceOver/TalkBack on Flutter, per TRD Section 8's semantic-label audit requirement). 

I.P. & M.D Platform — UI/UX Design Document 
Page 10 of 22 
• Status is never communicated by color alone: every badge and indicator pairs color with an icon and a 
text label. 
• Form errors are announced to assistive technology via ARIA live regions (web) / semantic 
announcements (Flutter), not just visually styled. 
• Automated accessibility linting runs in CI for the web app, per TRD Section 8; Flutter semantic labels are 
manually audited each release. 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 11 of 22 
4. Information Architecture by Role 
Each of the platform's seven roles gets a purpose-built navigation shell rather than a single navigation 
stripped down by permission — this avoids showing disabled/greyed items that would confuse or alarm users 
about capabilities they don't have. 
4.1 Patient IA 
Navigation Structure 
Primary Tab Bar (mobile) 
/ Top Nav (web) 
Home · Chat · Catalog · Orders · Profile — with a persistent bell icon for Notification Inbox 
and a floating "Upload" action reachable from Home and Catalog. 
Notes Upload is treated as the hero action (per BRD's core upload→verify→order→pay flow) and 
is never buried more than one tap from Home. 
4.2 Doctor IA 
Navigation Structure 
Primary Nav (web-first, 
per TRD Section 4.3) Verification Queue (default landing) · Patient Reports · Audit Log · Profile. 
Notes Verification Queue is the landing screen, not a generic dashboard — doctors' primary job-
to-be-done is clearing the queue within the 12-hour SLA (BRD KPI). 
4.3 Pharmacy Staff (Owned) IA 
Navigation Structure 
Primary Nav Order Queue (default landing) · Order Detail (drill-in) · Dispatch. 
Notes Compliance Check is presented as an inline step within Order Detail, not a separate nav 
item, so regulated items can't be skipped past. 
4.4 Partner Pharmacy IA 
Navigation Structure 
Primary Nav Order Queue (default landing) · Order Fulfillment (drill-in) · Payout/Settlement · Onboarding 
Status (pre-activation only). 
Notes Partner-facing UI is deliberately lighter-weight than the owned-inventory staff UI, reflecting 
the marketplace relationship (BRD Section 4). 
4.5 Admin Panel IA (Operations) 
Navigation Structure 
Primary Nav Dashboard (default landing) · Partner Pharmacies · Disputes · Verification Oversight. 

I.P. & M.D Platform — UI/UX Design Document 
Page 12 of 22 
Notes 
No navigation entry exists for account creation or system/security config — those routes 
are not merely hidden but structurally absent from this tier's shell, matching BRD's tier-
based blast-radius design (BRD Section 4.1). 
4.6 User Admin Panel IA 
Navigation Structure 
Primary Nav Pending KYC Queue (default landing) · Account Search · Suspend/Reinstate (drill-in from 
Account Detail). 
Notes No financial, inventory, or order-routing navigation exists in this shell (BRD FR-25). 
4.7 Super Admin Panel IA 
Navigation Structure 
Primary Nav Admin Accounts · Platform Settings · Compliance Override · Audit Log Query. 
Notes 
This is the only shell where Compliance Override and Platform Settings appear at all — 
visually distinguished with a darker header treatment (Teal/Dark) to signal elevated 
authority and the fact that every action here is audit-logged (BRD FR-29). 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 13 of 22 
5. Cross-Cutting UI Patterns 
These five patterns recur across nearly every screen in Section 6 and are specified once here to guarantee 
consistency, per the App Flow Document's conventions (Section 2). 
5.1 AI-Generated Content Disclosure Pattern 
Any field, chat reply, or explanation where is_ai_generated = true (TRD Item 36) carries a small Info-colored 
tag reading "AI-generated" inline with the content, plus — on first appearance per session — the fuller 
disclosure: "This is an informational interpretation, not a medical diagnosis." This tag cannot be dismissed 
permanently and cannot be visually suppressed by any user role, including Admins. 
5.2 Confidence Indicator Pattern 
Tier Visual Meaning / Behavior 
High confidence 
Green dot + "Verified 
match" or no badge 
(default state) 
Field shown as extracted, editable but not flagged 
Needs review Amber dot + "Needs 
review" 
Field visually distinct; routed to doctor verification queue 
per App Flow 4.1.2 
Low confidence / failed 
match 
Red dot + "Low 
confidence" 
Not auto-actioned; for catalog matching, shown only as a 
suggestion, never one-tap-added (App Flow 4.1.4, 
auto_addable = false) 
5.3 Compliance Gate Pattern (Schedule H/H1/X) 
Rendered identically at every point it appears (Cart Review, Checkout, Order creation error) as a full-width 
danger banner with three fixed elements: (1) which item is blocked, (2) why ("Requires a doctor-verified 
prescription"), (3) the single next action ("Attach verified prescription"). It is never a modal a user can dismiss 
— this mirrors the App Flow Document's explicit note that the gate is UI-convenience only in the cart and is 
re-enforced, non-bypassably, at the order-service layer (App Flow 4.1.4–4.1.5). 
5.4 Status & Lifecycle Stepper Pattern 
Order, prescription, and payment lifecycles (App Flow Section 5.1–5.3) are always shown as a stepper with 
the current state highlighted, terminal failure states (rejected, failed, cancelled) shown as a red terminus 
rather than an ambiguous dead end, so the patient always understands whether an action is still expected of 
them. 
5.5 Notification, Empty & Error States 
State Treatment 
Empty (e.g., no orders yet) Friendly, single-sentence copy + a clear primary action ("Upload your first 
prescription") — never a blank screen 

I.P. & M.D Platform — UI/UX Design Document 
Page 14 of 22 
Loading / Processing (e.g., 
extraction status) 
Determinate progress element bound to progress_pct where available; indeterminate 
spinner capped with an explicit "usually 15–30 seconds" expectation-setting caption 
(App Flow 4.1.2) 
Recoverable error (e.g., 
PAYMENT failed) 
Inline message + "Retry" primary action; the user's cart/context is explicitly preserved, 
and the copy says so 
Blocking/system error (e.g., 
ACCOUNT_SUSPENDED) 
Full-screen state explaining the block and, where applicable (suspension), how to seek 
reinstatement — never a generic "Something went wrong" 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 15 of 22 
6. Screen-by-Screen Wireframe Specifications 
Each specification below is a layout + component + state table rather than a pixel mockup, so the same 
specification is implementable consistently in React/Next.js and Flutter. Screen names match the App Flow 
Document's Screen Inventory (Section 6) exactly. 
6.1 Patient — Home 
Region Key Elements States / Notes 
Header Greeting + bell icon (unread count) + profile avatar Unread badge hidden at zero, 
per empty-state pattern 
Hero actions "Upload Prescription/Report" primary card, "Ask AI 
Assistant" secondary card 
Always above the fold on 
mobile 
Recent activity Recent prescriptions/reports as cards with lifecycle 
stepper chip 
Empty state: "No prescriptions 
yet — upload one to get 
started" 
Active orders Order Detail preview cards with current status chip Tapping opens Order 
Detail/Tracking (6.5) 
Quick nav Browse Catalog entry point — 
6.2 Patient — Upload & Extraction Result 
Region Key Elements States / Notes 
Upload Picker Camera / File source chips, inline size/type helper 
text 
Client-side pre-check per App 
Flow 4.1.2 step 1 
Uploading Determinate upload progress bar — 
Extraction Status Determinate progress ring bound to progress_pct + 
"usually 15–30s" caption 
On failure → "Upload Failed, 
Retry" full-screen state 
Extraction Result Field list, each row: label, value, Confidence 
Indicator (5.2), AI Disclosure tag (5.1) 
Report variant additionally 
shows reference range + 
abnormal flag styled in 
Warning/Danger color per 
severity 
Footer action "Awaiting Doctor Verification" lifecycle stepper chip, 
persistent until resolved 
Push/email/SMS notification 
triggers on resolution (App Flow 
4.1.2 step 5) 
6.3 Patient — AI Chat Assistant 
Region Key Elements States / Notes 
Consent (first use) Plain-language explanation of chat logging + 
Accept/Decline 
Declining still allows chat, 
disables history persistence 
(App Flow 4.1.3) 

I.P. & M.D Platform — UI/UX Design Document 
Page 16 of 22 
Chat Thread 
Message bubbles; every assistant reply carries the AI 
Disclosure tag (5.1) and a persistent footer 
disclaimer bar 
guardrail_triggered replies 
render as a distinct, calmer-
toned card with a "Talk to a 
doctor" / emergency-resource 
action, not a normal chat 
bubble 
Composer Text input + optional "Ground in [prescription 
name]" context chip — 
Chat History List of past sessions with delete action Hidden entirely if consent was 
declined for that session 
6.4 Patient — Catalog, Cart & Checkout 
Region Key Elements States / Notes 
Catalog Browse Search bar, filter chips, medicine cards with 
Schedule Badge (3.1) + stock status — 
Medicine Detail Owned/partner stock source list, price, generic-
equivalent mapping — 
Match from Prescription Suggested-match cards grouped High-confidence 
(one-tap add) vs. Needs review (suggestion only) 
Mirrors 5.2 confidence tiers 
exactly 
Cart Review Line items, per-item checkout_blocked indicator, 
inline "Attach verified prescription" prompt 
Compliance Gate Banner (5.3) 
shown above the checkout 
button whenever any item is 
blocked 
Delivery Address / 
Payment Method 
Saved addresses list; Razorpay method chips 
(card/UPI/netbanking/wallet) — 
Order Confirmation Order summary + per-line fulfillment source 
(owned/partner) + estimated delivery 
On payment failure → 
"Payment Failed, Retry" with 
cart explicitly preserved (5.5) 
6.5 Patient — Order Tracking & History 
Region Key Elements States / Notes 
Order History Filterable list by status chip Empty state per 5.5 
Order Detail / Tracking Lifecycle Stepper (5.4): placed → processing → 
dispatched → delivered, per line item 
Refund status shown inline once 
triggered 
Cancel action Destructive-styled button, confirmation step 
required 
Disabled with explanatory 
tooltip once past dispatch 
(ORDER_ALREADY_DISPATCHED) 
6.6 Doctor — Verification Queue & Review 
Region Key Elements States / Notes 

I.P. & M.D Platform — UI/UX Design Document 
Page 17 of 22 
Verification Queue 
Data Table: patient, submitted time, sla_breach 
indicator (Warning/Danger), needs_review filter 
default-on 
Default sort: oldest / most SLA-
at-risk first 
Prescription Review Split view — source document image alongside 
extracted fields with Confidence Indicators 
Doctor can edit any field inline 
(review_state → doctor_edited) 
before final action 
Approve / Reject Approve as-is (primary); Reject requires mandatory 
reason (modal, 3.6) 
Reject copy explicitly tells the 
doctor the patient will see the 
reason 
Audit Log Immutable, timestamped action history per 
prescription 
Read-only, no edit affordance 
shown anywhere 
6.7 Pharmacy Staff (Owned) — Order Queue & Compliance 
Region Key Elements States / Notes 
Order Queue Data Table filtered to this staff member's assigned 
fulfillment — 
Order Detail Line items + Schedule Badges; regulated items 
visually grouped at top — 
Compliance Check Inline confirmation step showing doctor_verified 
status before Dispatch is enabled 
Dispatch action disabled (not 
hidden) until compliance check 
is visibly satisfied 
6.8 Partner Pharmacy — Dashboard 
Region Key Elements States / Notes 
Onboarding Request / 
Status 
Pending-activation state screen with plain-language 
"awaiting Admin review" messaging — 
Order Queue / 
Fulfillment 
Same Data Table + status pattern as owned-
inventory staff, lighter chrome — 
Payout / Settlement Ledger table net of commission, filter by settlement 
period — 
6.9 Admin — Operations Dashboard & Oversight 
Region Key Elements States / Notes 
Dashboard 
KPI cards: orders today, SLA-breach count, 
verification queue depth, 30-day payment success 
rate 
Card thresholds use 
Warning/Danger color when 
off-target vs. BRD KPIs (Section 
9) 
Partner List / Onboard 
Partner 
Data Table + form; status and fulfillment radius 
editable 
Automatic de-listing on stale 
feed shown as a system-applied 
badge, distinct from manual 
status changes 

I.P. & M.D Platform — UI/UX Design Document 
Page 18 of 22 
Disputes List / Route 
Override 
Data Table; override action requires mandatory 
reason, persisted and shown in Audit Log — 
Overdue Verification 
Queue 
Filtered Doctor Queue view for 
escalation/reassignment — 
6.10 User Admin — KYC & Account Management 
Region Key Elements States / Notes 
Pending KYC Queue Data Table of doctor accounts awaiting license 
verification — 
Account Search / Detail Search + full status_history timeline — 
Suspend / Reinstate Reason-code required modal; status change 
reflected immediately, not just on next token refresh 
Copy makes clear token 
issuance is blocked instantly 
(App Flow 4.6.2) 
6.11 Super Admin — Settings & Compliance Override 
Region Key Elements States / Notes 
Admin Accounts List / 
Create / Edit 
Permissions 
Granular permission matrix editor 
Darker (Teal/Dark) header 
chrome throughout this shell 
(4.7) to signal elevated 
authority 
Platform Settings Commission rate, masked credential reference, 
security policy fields 
Credential values never echoed 
back in full, per App Flow 4.7.2 
Compliance Override Mandatory justification field, explicit "this instance 
only" scoping copy 
Every override auto-appends to 
Audit Log Query view 
Audit Log Query Filterable Data Table across all three admin tiers plus 
verification/refund events 
Read-only, exportable for 
regulatory demonstration (BRD 
Section 6, Auditability NFR) 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 19 of 22 
7. Responsive & Platform Behavior (Web vs. Flutter) 
Aspect Behavior 
Web breakpoints Mobile ≤640px (single column), Tablet 641–1024px (2-column where applicable), 
Desktop >1024px (full multi-column dashboard layouts for admin tiers) 
Patient-facing pages (web) Server-rendered/ISR for performance on catalog and marketing-adjacent pages (TRD 
Section 3.1); authenticated dashboards behave as an SPA 
Mobile app Flutter, single codebase for iOS/Android, sharing the same token spec as web (TRD 
Section 3.1) — no divergent color or type scale 
Doctor / Admin tiers Web-primary per TRD Section 4.3; mobile app surfaces a lightweight queue + 
notification view only, not the full data-table tooling 
Offline / connectivity 
Upload and cart actions queue locally on mobile with a visible "waiting to sync" state 
rather than failing silently, given the target market's variable connectivity (BRD Section 
8.1 assumption) 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 20 of 22 
8. Accessibility Compliance Summary (WCAG AA) 
Requirement (BRD Section 6 / TRD 
Section 8) Where It's Implemented in This Document 
WCAG AA color contrast Section 3.1 palette pairings verified 4.5:1 minimum for body text 
Status never conveyed by color alone Section 3.6 Status Badge / Schedule Badge — always icon + text + color 
Keyboard and screen-reader 
operability 
Section 3.7; automated CI linting (web) + manual Flutter semantic audit per 
release (TRD Section 8) 
Minimum legible type size Section 3.2 — 15px/14sp floor for all primary content 
Reduced-motion tolerance Section 3.5 — all state changes are legible with motion fully disabled 
Touch target sizing Section 3.3 — 44×44px mobile minimum 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 21 of 22 
9. Screen Inventory Cross-Reference 
Cross-referenced against the App Flow Document's Section 6 Screen Inventory. "Spec." indicates the screen 
has a dedicated wireframe specification in Section 6 of this document; other screens are covered by the 
shared component and pattern specifications in Sections 3 and 5. 
Role Screens Spec. Ref. 
Patient 
Home, Upload Picker, Extraction Status, Extraction Result, Chat Consent, 
Chat Thread, Chat History, Catalog Browse, Medicine Detail, Cart Review, 
Delivery Address, Payment Method, Order Confirmation, Order History, 
Order Detail/Tracking, Notification Inbox, Profile/Settings 
6.1–6.5 
Doctor Verification Pending, Verification Queue, Prescription Review, Audit Log, 
Patient Reports 6.6 
Pharmacy Staff 
(Owned) Order Queue, Order Detail, Compliance Check, Dispatch 6.7 
Partner Pharmacy Onboarding Request, Order Queue, Order Fulfillment, Payout/Settlement 6.8 
Admin Dashboard, Partner List, Onboard Partner, Disputes List, Route Override, 
Overdue Verification Queue 6.9 
User Admin Pending KYC Queue, Account Search, Account Detail, Suspend/Reinstate 6.10 
Super Admin Admin Accounts List, Create Admin/User Admin, Edit Permissions, 
Platform Settings, Compliance Override, Audit Log Query 6.11 
 

I.P. & M.D Platform — UI/UX Design Document 
Page 22 of 22 
10. Glossary 
Term Definition 
Design Token A named, reusable design value (color, spacing, type size) shared across the web and 
Flutter codebases (TRD Section 3.1) 
Compliance Gate A hard, server-enforced business rule (principally Schedule H/H1/X dispensing) 
rendered in the UI as a persistent, non-dismissible inline banner 
Confidence Indicator The three-tier visual (High / Needs Review / Low) shown next to any AI-extracted field 
AI Disclosure Tag The non-dismissible inline label marking any content where is_ai_generated = true 
Lifecycle Stepper The horizontal/vertical stepper component visualizing prescription, order, and 
payment state transitions 
WCAG AA Web Content Accessibility Guidelines, Level AA — the platform's baseline accessibility 
target (BRD Section 6) 
This UI/UX Document is derived from and must remain consistent with BRD_IPMD_Platform_v1 (v1.0), 
TRD_IPMD_Platform_v1 (v1.0), Database Schema Document (v1.0), API_Collection_IPMD_Platform_v1 (v1.0), and 
App_Flow_Document_IPMD_Platform_v1 (v1.0). Any design changes identified during implementation should be 
reflected back into those documents first, then propagated to this document and the Integration Plan (Doc 7). 


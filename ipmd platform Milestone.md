# **I.P. & M.D Platform — Development Milestone Tracker**

How to use this: each milestone has a **Goal**, **Antigravity tasks**, a **Verification checklist**, and **Exit criteria**. Don't start the next milestone until every Exit Criteria box is checked. If a check fails, fix it inside the current milestone — don't carry broken work forward.

Mark status per milestone: 🔲 Not started | 🟡 In progress | ✅ Verified complete

---

## **M0 — Planning & Documentation**

**Status: ✅**

**Goal:** All 7 source-of-truth documents exist and are trustworthy inputs for every future agent task.

* \[x\] BRD, TRD, Database Schema, API Collection, App Flow, UI/UX, Integration Plan — converted to `.md`  
* \[x\] `/docs/00_project_brief.md` created as the agent entry point  
* \[x\] Spot-checked converted docs for corruption (esp. tables, money fields, FKs)

**Exit criteria:** All docs committed to `/docs`. Every future milestone prompt should start with "Read `/docs/00_project_brief.md` \+ relevant doc(s)."

---

## **M1 — Repo & Environment Scaffold**

**Status: ✅**

**Goal:** A real, runnable monorepo skeleton exists.

* \[x\] `/apps/web`, `/apps/mobile`, `/services/api`, `/services/ai`, `/infra`, `/docs`  
* \[x\] Root `.gitignore`, `README.md`, `docker-compose.yml`  
* \[x\] Committed as "Initial monorepo scaffold"

**Exit criteria:** `docker compose config` validates; FastAPI `/health` endpoint returns `{"status":"ok"}`.

---

## **M2 — Database Layer**

**Status: ✅**

**Goal:** All 41 tables exist in Postgres, matching the schema doc exactly.

* \[x\] SQLAlchemy models for all 8 domains  
* \[x\] Alembic configured, initial migration generated and applied  
* \[x\] pgvector extension working (`knowledge_embeddings.embedding` is `vector(1536)`)  
* \[x\] Naming-collision bug fixed across all model files  
* \[x\] Port-conflict issue resolved, migration applied against real Postgres

**Verification checklist (already passed):**

* \[x\] `alembic current` → shows head revision, no error  
* \[x\] `\dt` → 42 tables (41 \+ `alembic_version`)  
* \[x\] `\d payment_intents` → `amount_paise` is `bigint`  
* \[ \] `\d knowledge_embeddings` → embedding column is `vector(1536)` *(confirm this one — flagged last message, not yet confirmed back)*

**Exit criteria:** All boxes above checked. Work committed: `git commit -m "Add Alembic migrations and 41 schema tables"`.

---

## **M3 — Auth & RBAC**

**Status: ✅**

**Goal:** Every one of the 7 roles can register/login, get scoped JWTs, and be blocked when suspended or under-permissioned.

**Before starting — decide:** does V1 require email/OTP verification before account activation? Check BRD §registration flow + App Flow doc. Bake the answer into the prompt, don't retrofit later.

**Antigravity tasks:**

* [x] JWT access + refresh token flow (refresh tokens hashed in `refresh_tokens` table)  
* [x] Register / login / refresh / logout endpoints  
* [x] Password hashing (bcrypt/argon2); OAuth path sets `oauth_provider`, leaves `password_hash` null  
* [x] RBAC dependency enforcing all 7 roles  
* [x] `admin_permissions` granular permission check for admin/user_admin routes  
* [x] Live `status` check (reject `suspended`) on every authenticated request  
* [x] Unit tests: happy path, suspended rejection, wrong-role rejection, permission-gated rejection

**Verification checklist:**

* [x] Register a user of each of the 7 roles via API (Postman/curl) — succeeds  
* [x] Login returns access + refresh token; refresh token row appears in `refresh_tokens` (hashed, not plaintext)  
* [x] Suspended user login/API call → rejected, not silently allowed  
* [x] Wrong-role access to a role-gated endpoint → 403, not 200  
* [x] `pytest` suite passes, includes negative-path tests listed above  
* [x] DB credentials moved out of hardcoded `env.py` into `.env` (flagged earlier, close it out here)

**Exit criteria:** All checks pass, tests committed and passing, no hardcoded secrets in tracked files.

---

## **M4 — Prescription & Report Intake (core, pre-AI)**

**Status: 🔲**

**Goal:** Upload → storage → status-tracking pipeline works end-to-end, with AI steps stubbed for now.

**Antigravity tasks:**

* \[ \] Upload endpoint (`documents`, `prescriptions`, `reports` tables) — file validation (type, 20MB max), malware-scan status field  
* \[ \] Extraction status state machine (`queued → processing → extracted → needs_review → failed`)  
* \[ \] Doctor verification endpoints (`verification_status`, `verification_actions`) — gates checkout later  
* \[ \] Celery job stub that transitions status (real OCR/NLP wired in M9)

**Verification checklist:**

* \[ \] Upload a real file via API → row appears in `documents` \+ `prescriptions`  
* \[ \] File \> 20MB → rejected with correct error, not silently truncated  
* \[ \] Status transitions correctly through the state machine (manually trigger for now)  
* \[ \] Non-doctor role cannot call verification-approval endpoint (RBAC from M3 enforced here)

**Exit criteria:** Upload-to-verification flow works with stubbed AI; doctor verification blocks/unblocks correctly.

---

## **M5 — Catalog & Inventory**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] `medicine_catalog_items`, `owned_inventory_stock`, `partner_pharmacies`, `partner_stock`, `generic_equivalent_map` CRUD/read endpoints  
* \[ \] Search/list with pagination per API Collection doc

**Verification checklist:**

* \[ \] Catalog search returns correct results with pagination  
* \[ \] Stock quantities reflect both owned \+ partner sources correctly

**Exit criteria:** Catalog browsable and stock-accurate via API.

---

## **M6 — Orders & Fulfillment**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Cart → order flow (`carts`, `cart_items`, `orders`, `order_line_items`)  
* \[ \] **Hard rule enforced server-side:** no checkout on Schedule H/H1/X items without `verification_status = doctor_verified` prescription linkage  
* \[ \] Order-routing engine (`fulfillment_records`, `routing_decisions`) — owned vs partner selection  
* \[ \] `order_disputes` flagging \+ resolution endpoints

**Verification checklist:**

* \[ \] Attempt checkout on a regulated item with an unverified prescription → hard blocked, test this explicitly  
* \[ \] Attempt with verified prescription → succeeds  
* \[ \] Routing decision correctly picks owned vs partner source based on stock/price/SLA  
* \[ \] Idempotency key prevents duplicate order creation on retry

**Exit criteria:** The Schedule H/H1/X block is proven with an actual failing test, not just code review — this is your single most legally-sensitive rule.

---

## **M7 — Payments**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Razorpay order creation (`payment_intents`) before client payment  
* \[ \] Server-side signature verification on capture (`payment_captures`)  
* \[ \] Refunds (partial supported), `payout_ledger` for partner settlement

**Verification checklist:**

* \[ \] Test-mode Razorpay payment completes and reconciles server-side  
* \[ \] Tampered/invalid signature → rejected, not accepted  
* \[ \] Partial refund reduces correct amount, doesn't double-refund

**Exit criteria:** Full payment lifecycle (intent → capture → refund) verified in Razorpay test mode.

---

## **M8 — Notifications**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] `notification_events`, `delivery_logs`, `user_channel_preferences`  
* \[ \] Redis-backed queue dispatch (per user's channel prefs — push/SMS/email)

**Verification checklist:**

* \[ \] Triggering event (e.g. order status change) creates a notification row and attempts delivery  
* \[ \] User who opted out of a channel doesn't receive it on that channel

**Exit criteria:** At least one real end-to-end notification (e.g. order confirmation) delivered in dev.

---

## **M9 — AI/ML Service (OCR → NLP → Chat/RAG)**

**Status: 🔲**

**Goal:** Replace the M4 stub with real extraction; add the health chat assistant.

**Antigravity tasks:**

* \[ \] OCR pipeline on uploaded documents → populates `extracted_fields` with confidence scores  
* \[ \] Sub-threshold (\< 0.85) confidence → auto-routes to `needs_review`  
* \[ \] Medical NLP for report parsing (`report_values`)  
* \[ \] Chat assistant (`chat_sessions`, `chat_messages`, `knowledge_embeddings` via pgvector RAG)  
* \[ \] **Mandatory disclosure:** chat assistant states it's non-diagnostic; escalates emergency-flagged queries

**Verification checklist:**

* \[ \] Upload a real prescription image → extracted fields populate with plausible confidence scores  
* \[ \] Low-confidence field correctly routes to doctor review queue  
* \[ \] Chat assistant discloses non-diagnostic status in its first response of a session  
* \[ \] RAG retrieval returns relevant grounding content (spot-check a few queries)

**Exit criteria:** Real OCR/NLP output verified against 3-5 sample prescriptions/reports you provide manually; chat safety disclosure confirmed present.

---

## **M10 — Admin Panels (User Admin → Admin → Super Admin, in this order)**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] User Admin: KYC/doctor license verification, account status management  
* \[ \] Admin: dispute resolution, routing overrides, permission-gated operational tools  
* \[ \] Super Admin: permission grants (`admin_permissions`), full audit log access, platform settings

**Verification checklist:**

* \[ \] Each tier can only do what BRD §4.1's "cannot do" matrix allows — test at least one forbidden action per tier and confirm it's blocked  
* \[ \] Every admin action produces an `audit_log_entries` row  
* \[ \] Audit log is genuinely append-only (attempt UPDATE/DELETE as app role → fails at DB level)

**Exit criteria:** Tier-boundary violations are provably blocked, not just assumed; audit trail confirmed immutable.

---

## **M11 — Web Client (Next.js)**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Screens per App Flow doc, styled per UI/UX doc, screen-by-screen (don't build all at once)  
* \[ \] Wire to real API endpoints from M3–M10 (no mock data by this point)

**Verification checklist:**

* \[ \] Walk the full patient journey manually in browser: register → upload → order → pay → track  
* \[ \] Walk the doctor verification journey  
* \[ \] Walk at least one admin-tier journey  
* \[ \] Responsive check on mobile viewport width

**Exit criteria:** All three journeys above completed manually by you, end-to-end, no broken screens.

---

## **M12 — Mobile Client (Flutter)**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Same screen set as M11, adapted for mobile per App Flow/UI-UX docs  
* \[ \] Push notification integration (Firebase, from M8)

**Verification checklist:**

* \[ \] Same three journeys as M11, run on emulator or device  
* \[ \] Push notification actually arrives on a test device

**Exit criteria:** Feature parity confirmed with web for core patient/doctor flows.

---

## **M13 — Third-Party Integrations & DevOps Wiring**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Firebase (push), SMS gateway (India DLT-compliant templates), Razorpay live-mode config (kept separate from test)  
* \[ \] Terraform environments (dev/staging/prod), CI/CD pipeline (GitHub Actions)

**Verification checklist:**

* \[ \] SMS/push actually delivered in a staging-like environment  
* \[ \] CI pipeline runs tests \+ lint on every PR, blocks merge on failure  
* \[ \] Terraform plan reviewed manually before any apply — never let an agent apply to prod unsupervised

**Exit criteria:** Staging environment stands up from Terraform \+ CI/CD without manual intervention.

---

## **M14 — Testing & QA Pass**

**Status: 🔲**

**Antigravity tasks:**

* \[ \] Generate tests traced to BRD functional requirement IDs (FR-x.x) for any gaps found in earlier milestones  
* \[ \] Load-test the routing engine and catalog search against TRD's NFR targets

**Verification checklist:**

* \[ \] Coverage report reviewed — no critical module (auth, payments, prescription-verification) below an acceptable threshold  
* \[ \] NFR targets (response time, throughput) met under load test

**Exit criteria:** No known-untested critical path remains.

---

## **M15 — Compliance & Legal Gate**

**Status: 🔲 — human gate, not an Antigravity task**

* \[ \] Schedule H/H1/X enforcement reviewed by a legal/compliance professional, not just engineering  
* \[ \] DPDP Act data-handling practices (retention, deletion, consent) reviewed  
* \[ \] Audit log immutability and access-control reviewed

**Exit criteria:** Explicit sign-off from a qualified person — this gate cannot be closed by code review alone.

---

## **M16 — Deployment Readiness**

**Status: 🔲**

* \[ \] Production Terraform environment provisioned  
* \[ \] Secrets management confirmed (no hardcoded credentials anywhere in the repo — recheck this, it was flagged back in M2/M3)  
* \[ \] Monitoring/alerting wired (error tracking, uptime, payment-failure alerts at minimum)  
* \[ \] Rollback plan documented and tested once in staging  
* \[ \] Final smoke test of all core journeys in a prod-like environment

**Exit criteria:** You could hand this repo to a new engineer and they could deploy it from the README alone.

---

## **How to keep this file useful**

* Update the ✅/🟡/🔲 status markers as you go — treat this file itself as something you commit to the repo (`/docs/MILESTONES.md`), so progress is visible to anyone (including future Antigravity agents) who opens the project.  
* Paste back to me your checklist state anytime and say "what's next" — I'll pick up exactly from wherever you've marked.  
* Never let a milestone's Exit Criteria be "the agent said it's done" — every milestone above has at least one check *you* run yourself.


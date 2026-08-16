# I.P. & M.D Platform — Project Brief

**Intelligent Prescription & Medicine Discovery Platform** — a healthtech e-commerce
platform (India V1) that lets patients upload prescriptions/reports, routes them through
an AI extraction pipeline (OCR + Medical NLP) with mandatory doctor verification, and
fulfills orders through a hybrid model (owned inventory + partner pharmacies), with
integrated payments, notifications, and a 3-tier admin back office.

## Core flow (build/priority order)
`Upload → AI extraction → Doctor verification → Catalog match → Order → Payment → Fulfillment`

This is the V1 priority. Secondary features (teleconsultation, refill automation,
expanded AI chat, loyalty/subscriptions, international expansion) are Phase 2/3 — do not
build ahead of the core flow.

## Roles (7 types)
Patient, Doctor, Pharmacy Staff, Super Admin, Admin, User Admin, (+ AI Chat Assistant as
a system actor). Admin tiers are strictly scoped — see BRD §4.1 for the "cannot do" column
per tier; this drives RBAC design.

## Hard constraints (non-negotiable, check before building any related feature)
- No checkout on Schedule H/H1/X (or regional equivalent) medicines without a valid,
  doctor-verified prescription linkage.
- Every doctor verification action and every admin-tier action must be immutably
  audit-logged (append-only / WORM).
- AI chat assistant must disclose it is non-diagnostic and must never replace a doctor
  for diagnostic/emergency concerns.
- Health data encrypted at rest & in transit; DPDP Act (India) considerations apply to
  all personal/health data handling.

## Tech stack (see TRD for full detail)
- Web: React 18 + Next.js (App Router)
- Mobile: Flutter (iOS + Android)
- Backend: FastAPI (Python 3.12+), modular monolith behind an API Gateway/BFF
- AI/ML: separate service — OCR + Medical NLP + confidence scoring + LangChain chat (RAG)
- Data: PostgreSQL + pgvector, Redis (cache/queue), S3-compatible object storage
- Background jobs: Celery/RQ
- Integrations: Razorpay (payments), Firebase (push), SMS gateway (India DLT compliant)
- Infra: Docker, Kubernetes, Terraform, GitHub Actions

## Document index
| Doc | Purpose |
|---|---|
| `BRD.md` | Business goals, scope, roles, functional requirements, KPIs, compliance |
| `TRD.md` | Architecture, tech stack, module boundaries, NFRs |
| `Database_Schema.md` | ER model, table definitions, constraints |
| `API_Collection.md` | Endpoint contracts, request/response schemas, auth |
| `App_Flow.md` | Screen-by-screen and state-transition flow (web/mobile) |
| `UIUX.md` | Wireframes, design system, accessibility (WCAG AA target) |
| `Integration_Plan.md` | Third-party integration & credential/config steps |

## For agents working in this repo
1. Read this file first.
2. For schema/table work → `Database_Schema.md` is the source of truth.
3. For endpoint contracts → `API_Collection.md` is the source of truth.
4. For screen/state logic → `App_Flow.md`.
5. For visual/design decisions → `UIUX.md`.
6. Cross-reference BRD functional requirement IDs (e.g. `FR-5.1.3`) when implementing a
   feature, so the code traces back to the spec.
7. Never bypass the "hard constraints" section above regardless of what a specific task
   description asks for.
# I.P. & M.D Platform Monorepo

AI-powered prescription intelligence & medicine delivery platform — OCR/NLP prescription extraction, doctor verification, hybrid pharmacy fulfillment, and payments (India V1).

## Repository Layout

```
.
├── apps/
│   ├── web/           # Next.js 18+ web application (App Router, TypeScript)
│   └── mobile/        # Flutter mobile application (iOS & Android)
├── services/
│   ├── api/           # FastAPI backend service (Python 3.12+, REST API)
│   └── ai/            # FastAPI service skeleton for OCR/NLP models
├── infra/
│   ├── docker/        # Docker containers and docker-compose configs
│   ├── terraform/     # Infrastructure as Code (IaC) templates
│   └── k8s/           # Kubernetes manifests & Helm charts
├── docs/              # Platform documentation and architecture diagrams
├── docker-compose.yml # Local development infrastructure (PostgreSQL, Redis)
└── README.md
```

## Quick Start (Local Dev)

### Local Infrastructure
Start PostgreSQL and Redis containers:
```bash
docker-compose up -d
```

### Backend Services
Navigate to `/services/api`:
```bash
cd services/api
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

### Web Application
Navigate to `/apps/web`:
```bash
cd apps/web
npm install
npm run dev
```

### Mobile Application
Navigate to `/apps/mobile`:
```bash
cd apps/mobile
flutter pub get
flutter run
```

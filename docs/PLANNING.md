# {{PROJECT_NAME}} — Planning Document

> Source of truth for architecture, design decisions, and roadmap.
> Update this document as the project evolves. It's a living spec, not a snapshot.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [API / Protocol Spec](#api--protocol-spec)
- [Data Model](#data-model)
- [Security](#security)
- [Roadmap](#roadmap)
- [Decisions Log](#decisions-log)

---

## Overview

### What

{{PROJECT_DESCRIPTION}}

### Why

<!-- What problem does this solve? Who is it for? Why build it? -->

### Success Metrics

<!-- How do you know when this project is successful? -->

- [ ] Metric 1
- [ ] Metric 2
- [ ] Metric 3

---

## Architecture

### High-Level Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│   Frontend   │────▶│   Backend    │────▶│   Database   │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

<!-- Replace with your actual architecture diagram -->

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | {{FRONTEND_FRAMEWORK}} | <!-- Reason --> |
| Backend | {{BACKEND_FRAMEWORK}} | <!-- Reason --> |
| Database | {{DATABASE}} | <!-- Reason --> |
| Hosting | <!-- TBD --> | <!-- Reason --> |

### Key Design Decisions

<!-- Document important architectural choices and their rationale -->

1. **Decision**: <!-- What was decided -->
   - **Context**: <!-- Why this decision was needed -->
   - **Options considered**: <!-- What alternatives were evaluated -->
   - **Rationale**: <!-- Why this option was chosen -->

---

## Components

### Frontend (`{{FRONTEND_DIR}}/`)

<!-- Describe the frontend architecture -->

**Responsibilities:**
-

**Key directories:**
```
{{FRONTEND_DIR}}/
├── src/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   └── utils/
```

### Backend (`{{BACKEND_DIR}}/`)

<!-- Describe the backend architecture -->

**Responsibilities:**
-

**Key directories:**
```
{{BACKEND_DIR}}/
├── src/
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── middleware/
```

---

## API / Protocol Spec

<!-- Define your API endpoints, WebSocket messages, or protocol -->

### Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | None |
| POST | `/api/auth/login` | User login | None |
| GET | `/api/resource` | List resources | Required |

### Request/Response Shapes

```typescript
// Example: GET /api/resource
interface ResourceResponse {
  id: string;
  name: string;
  createdAt: string; // ISO 8601
}
```

---

## Data Model

<!-- Define your data model / schema -->

### Entities

```
User
├── id: UUID
├── email: string
├── name: string
├── createdAt: DateTime
└── updatedAt: DateTime

Resource
├── id: UUID
├── userId: UUID (FK -> User)
├── name: string
├── data: JSON
├── createdAt: DateTime
└── updatedAt: DateTime
```

---

## Security

### Authentication

<!-- How users authenticate -->

### Authorization

<!-- How permissions are enforced -->

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| XSS | Input sanitization, CSP headers |
| CSRF | Token-based protection |
| SQL Injection | Parameterized queries |
| Secret exposure | Environment variables, never in code |

---

## Roadmap

### Phase 1: "{{PHASE_1_THEME}}"

**Goal:** <!-- What can the user do after this phase? -->

**Success Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Wave 1 (Independent):**
- [ ] Task A ({{COMPONENT}}) — Description
- [ ] Task B ({{COMPONENT}}) — Description

**Wave 2 (Depends on Wave 1):**
- [ ] Task C ({{COMPONENT}}) — Description

### Phase 2: "{{PHASE_2_THEME}}"

**Goal:** <!-- What's next? -->

**Success Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

### Future Phases (Backlog)

- Phase 3: <!-- Theme -->
- Phase 4: <!-- Theme -->

---

## Decisions Log

Track important decisions so they don't get re-debated:

| Date | Decision | Rationale | Revisit? |
|------|----------|-----------|----------|
| <!-- date --> | <!-- what --> | <!-- why --> | <!-- when/if --> |

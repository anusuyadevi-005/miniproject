# RepoMind AI & ASDSE Platform
### Enterprise AI Repository Intelligence & Continuous Documentation Synchronization Engine

---

## 1. System Overview

**RepoMind AI** is a production-grade Repository Intelligence and Technical Documentation platform that autonomously ingests software codebases, performs deterministic multi-language AST and syntax analysis, reconstructs software architectures and requirements, and continuously synchronizes documentation with code changes through the **Adaptive Semantic Documentation Synchronization Engine (ASDSE)**.

```text
Git URL / Local Folder / ZIP Archive
                ↓
    Central Agent Orchestrator
                ↓
┌──────────────────────────────────────────────┐
│  1. Repository Scout (Sandbox Ingestion)     │
│  2. Language & Framework Analyzer            │
│  3. Code Intelligence Agent (AST Adapters)   │
│  4. Dependency Graph Agent                   │
│  5. Database & ORM Reconstruction Agent      │
│  6. API Route & Schema Agent (OpenAPI 3.0)   │
│  7. Requirements Reconstruction Agent (SRS)  │
│  8. User Role Discovery Agent (Matrix)       │
│  9. Architecture Reconstruction Agent        │
│ 10. Workflow & Sequence Agent                │
│ 11. Architecture Diagram Agent (10 Mermaid)  │
│ 12. Security & Secret Masking Agent          │
│ 13. Testing & Coverage Agent                 │
│ 14. Verification Agent (Anti-Hallucination)  │
│ 15. Drift Detection & Quality Scores Agent   │
│ 16. ASDSE Continuous Synchronization Agent   │
└──────────────────────┬───────────────────────┘
                       ↓
       Central Repository Knowledge Graph
                       ↓
      17-Document Enterprise Package & Exports
```

---

## 2. Core Capabilities

### A. Multi-Source Ingestion & Sandbox Isolation
* **Git Repositories**: Clones remote Git repositories (GitHub, GitLab, Bitbucket) shallowly (`--depth 1`).
* **Local Workspace Ingestion**: Recursively scans local project directories while enforcing ignore rules (`node_modules`, `.git`, `dist`, `target`, `__pycache__`).
* **ZIP Archive Upload**: Safely extracts uploaded archives with Zip-Slip path traversal prevention and decompression bomb limits.

### B. Deterministic Multi-Language AST Analysis
* Supported languages: **JavaScript, TypeScript, Python, Java, Go, C#, C++, PHP, Rust, Kotlin, Dart, and SQL**.
* Extracts classes, methods, inheritance, decorators, annotations, routes, database models, and imports deterministically without hallucination.

### C. 10 Dynamic Mermaid Architecture Diagrams
1. **System Context Diagram** (C4 Level 1)
2. **Container Diagram** (C4 Level 2)
3. **Component Diagram** (C4 Level 3)
4. **Deployment Topology Diagram**
5. **Data Flow Diagram**
6. **Execution Sequence Diagram**
7. **Entity-Relationship Diagram (ERD)**
8. **Dependency Graph**
9. **Authentication & Session Flow**
10. **AI / LLM Workflow**

### D. 17 Formal Enterprise Documents Package
* `01 — Executive Overview`
* `02 — Software Requirements Specification (SRS)`
* `03 — System Architecture Document`
* `04 — Module Documentation`
* `05 — API Documentation`
* `06 — Database Documentation`
* `07 — Workflow Documentation`
* `08 — Security Documentation`
* `09 — Testing Documentation`
* `10 — Deployment Documentation`
* `11 — Configuration Documentation`
* `12 — External Integration Documentation`
* `13 — AI/ML Documentation`
* `14 — Developer Onboarding Guide`
* `15 — Repository Map`
* `16 — Architecture Decision Records (ADRs)`
* `17 — End-to-End Traceability Matrix`

### E. ASDSE Continuous Synchronization & Drift Engine
* **Stable Documentation IDs (SDID)**: Universal identifiers (`SDID-AUTH-001`, `SDID-REQ-001`) binding code symbols to requirements and documentation blocks.
* **Documentation DNA**: Fingerprinted code tuples tracking AST signatures to detect drift.
* **Impact Radius Calculation**: Transitive dependency propagation determining exactly which documentation blocks require selective regeneration upon commit diffs.
* **Measurable Quality Scores**: Coverage, Accuracy, Traceability, Freshness, Completeness, Consistency, and Confidence with explicit calculation formulas.

---

## 3. API Endpoints (`/api/v1`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/repositories/analyze` | Ingest and analyze a remote Git repository URL |
| `POST` | `/api/v1/analyze/local` | Ingest and analyze a local directory path |
| `POST` | `/api/v1/analyze/upload` | Ingest and analyze an uploaded ZIP archive file |
| `GET` | `/api/v1/repositories` | List all analyzed repositories |
| `GET` | `/api/v1/repositories/:id` | Get full analysis payload for a repository |
| `GET` | `/api/v1/repositories/:id/architecture` | Get architecture style, layers, and 10 Mermaid diagrams |
| `GET` | `/api/v1/repositories/:id/requirements` | Get Functional and Non-Functional requirements |
| `GET` | `/api/v1/repositories/:id/apis` | Get API route definitions and OpenAPI 3.0 specification |
| `GET` | `/api/v1/repositories/:id/database` | Get database entities, schemas, and ER diagrams |
| `GET` | `/api/v1/repositories/:id/traceability` | Get Requirement-to-Code Traceability Matrix |
| `GET` | `/api/v1/repositories/:id/documentation` | Get the complete 17 formal documents |
| `GET` | `/api/v1/repositories/:id/drift` | Get Documentation Drift Report & Quality Scores |
| `GET` | `/api/v1/repositories/:id/export/:format` | Export bundle (`markdown`, `html`, or `openapi`) |
| `POST` | `/api/v1/repositories/:id/sync` | Trigger continuous ASDSE commit diff synchronization |

---

## 4. Running Locally

### Option A: Run Both Backend & Frontend in One Command (Recommended)
From the project root:
```bash
# 1. Install all dependencies across root, backend, and frontend
npm run install:all

# 2. Start both Backend (port 5000) and Frontend (port 5173) concurrently
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000`

> 💡 **Troubleshooting Port In Use**: If port 5000 or 5173 is locked by a previous process, run:
> ```bash
> npm run kill-port
> ```

### Option B: Run Services in Separate Terminals

#### Terminal 1 — Backend:
```bash
cd backend
npm install
npm run dev   # Runs on http://localhost:5000
```

#### Terminal 2 — Frontend:
```bash
cd frontend
npm install
npm run dev   # Runs on http://localhost:5173
```


---

## 5. Docker Deployment

Deploy all services using Docker Compose:

```bash
docker-compose up --build -d
```

* **Frontend Dashboard**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`
* **MongoDB**: `localhost:27017`

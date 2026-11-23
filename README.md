# ISO Audit Report Generator (Control Union — CU SLAB Rev 01)

Standalone React + TypeScript + Tailwind CSS web application that guides ISO auditors through the **ISO 9001 (QMS)**, **ISO 14001 (EMS)**, and **ISO 45001 (OHS)** audit checklist and exports a completed, formatted `.xlsx` workbook matching `docs/Audit Report Format-CU SLAB - Rev;01 1.xlsx`.

## Project Structure

```text
iso-checklist/
├── frontend/          # React + TypeScript + Tailwind CSS + Vite app
├── docs/              # Reference Excel template (gitignored)
├── .gitignore
└── README.md
```

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Key Features

- **Dynamic Scheme Filtering:** All scheme-tagged clauses across Clauses 4–10 (including `5.4`, `6.1.2–6.1.5`, `7.1.2–7.1.5`, `8.1.2–8.7`, and `9.1.2`) automatically show or hide based on the selected scheme(s).
- **Clause 8.3 N/A Cascade:** Marking `8.3 Design & Development (9001)` as `N/A` populates outcome `c.` and automatically hides sub-clauses `8.3.1`–`8.3.6`.
- **Auto-Selected Outcomes & Auditor Remarks:** Selecting `Comply` / `Observation` selects outcome `a.`; selecting `Minor NC` / `Major NC` selects outcome `b.` and enables the `Open / Closed` NC toggle. A dedicated **Auditor Remarks** field is available on every clause regardless of status.
- **Excel Export (`.xlsx`):** Generates all 7 template sheets (`Audit Details`, `Audit Introduction and CU`, `Audit findings & Conclusion`, `Clause 4 and 5`, `Clause 6 and 7`, `Clause 8`, `Clause 9 and 10`) with a dedicated `Auditor Remarks` column plus an 8th auto-generated `List of Findings` sheet and live `COUNTIF` / `COUNTIFS` / `SUM` formulas.
- **Local Drafts & Future Database Ready:** Drafts auto-save in `localStorage` and can be exported/imported as `.json` files via the `AuditRepository` abstraction (`frontend/src/repositories/AuditRepository.ts`), ready to be backed by a `backend/` API and database in Phase 2 without changing UI or export code.

## JSON Clause Data

All template metadata and clause definitions live in JSON files under `frontend/src/data/`:

- `frontend/src/data/audit-config.json`
- `frontend/src/data/clauses/clause-4-5.json`
- `frontend/src/data/clauses/clause-6-7.json`
- `frontend/src/data/clauses/clause-8.json`
- `frontend/src/data/clauses/clause-9-10.json`

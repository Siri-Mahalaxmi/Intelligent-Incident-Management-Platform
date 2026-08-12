# IIMP — Intelligent Incident Management Platform

A Next.js frontend for managing and analyzing engineering incidents.

---

## Branch: `feature/incident-form-detail`

> **No backend required.** This branch runs entirely on mock/local data. All data operations are wired through `src/services/incidentsService.ts` with simulated latency — no network calls are made.

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | **v18 or higher** |
| npm | Comes bundled with Node.js |
| Git | Any recent version |

Download Node.js from [nodejs.org](https://nodejs.org) if you don't have it.  
Verify your version: `node --version`

---

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd Intelligent-Incident-Management-Platform

# 2. Check out this feature branch
git checkout feature/incident-form-detail

# 3. Install dependencies
cd iimp-app
npm install

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## What's in this branch

### Incident Dashboard (`/`)
- Lists all incidents with severity/status filters and sort-by-severity toggle
- Live incident count summary in the header (total, open, critical)
- Click any row or incident ID to navigate to the detail page

### New Incident Form
- Click **New Incident** in the header to open a modal
- Fields: title, service, severity, status, description, and raw logs
- Simulates a 400ms loading state on submit
- ~10% chance of a simulated error to test the error state (just retry)
- On success the new incident appears in the table immediately

### Incident Detail (`/incidents/[id]`)
- Full incident details: title, service, severity, status, description, created timestamp
- Logs displayed in a scrollable monospace block
- **Analyze Incident** button runs a mock AI analysis (~1.8s delay) and renders:
  - Summary, probable severity badge, key error patterns list, confidence progress bar

### Mock data & service layer
All data functions live in `src/services/incidentsService.ts`:
- `getIncidents()` — returns the incident list
- `getIncidentById(id)` — returns a single incident
- `createIncident(payload)` — generates id + created_at locally, prepends to list
- `analyzeIncident(id)` — returns a mock analysis result

Swapping to a real API later only requires changing the internals of these four functions — no component code changes needed.

---

## Project structure

```
src/
  app/
    page.tsx                  # Dashboard
    layout.tsx                # Root layout (wraps IncidentsProvider)
    incidents/[id]/page.tsx   # Detail page
    globals.css
  components/
    SeverityBadge.tsx
    StatusBadge.tsx
    CreateIncidentModal.tsx   # New incident form modal
  context/
    IncidentsContext.tsx      # Shared incidents state across pages
  data/
    seedIncidents.ts          # Mock seed data (3 realistic incidents)
  services/
    incidentsService.ts       # All data operations (mock now, real API later)
  types/
    incident.ts               # Incident, Severity, Status types
```

---

## Available scripts

```bash
npm run dev     # Start development server on localhost:3000
npm run build   # Production build
npm run start   # Start production server (requires build first)
npm run lint    # Run ESLint
```

---

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [TypeScript 5](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)

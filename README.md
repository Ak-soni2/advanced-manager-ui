# Automated Task Manager Frontend

Next.js frontend for the Automated Task Manager platform. The UI provides role-based experiences for managers and developers, including extraction workflows, task execution flows, AI assistant interactions, GitHub sync controls, and performance analytics.

## Tech Stack

- Next.js 16 (App Router, Turbopack in dev)
- React 19 + TypeScript
- CSS token system via `app/globals.css`
- Header-based auth context via local storage

## Product Features

### Manager Experience

- Overview metrics and status distribution
- Transcript upload and AI extraction trigger
- Pending-review queue for validation and assignment
- Full task editing controls
- Team management and developer creation
- Bulk GitHub issue sync
- Employee evaluation matrix

### Developer Experience

- Personal dashboard and urgent-task focus cards
- Task progress actions (`confirmed -> in_progress -> done`)
- Thread updates and status assist
- Personal GitHub sync action
- Team leaderboard (ranked performance matrix)

### Shared Experience

- Sidebar navigation shell
- Role-scoped AI assistant panel
- Toast feedback for action results and failures

## Architecture (HLD)

1. User authenticates in `/login`.
2. Frontend stores user in auth context + `localStorage`.
3. Dashboard pages call backend through centralized API client (`lib/api.ts`).
4. Backend authorization is driven by headers:
   - `X-User-Id`
   - `X-User-Role`
5. UI state updates and renders cards/tables/threads.

## Low-Level Structure (LLD)

### Folder Map

```text
frontend/
  app/
    layout.tsx
    globals.css
    login/page.tsx
    dashboard/
      manager/
      developer/
  components/
    Sidebar.tsx
    Badges.tsx
    Toast.tsx
  lib/
    api.ts
    auth-context.tsx
```

### Core Files

- `app/layout.tsx`
  - Root shell, background layers, auth provider
- `app/login/page.tsx`
  - Login/signup tabbed flow
- `lib/auth-context.tsx`
  - Reads/writes `atm_user` from local storage
- `lib/api.ts`
  - Request wrapper + all endpoint namespaces
- `components/Sidebar.tsx`
  - Navigation + AI assistant toggle panel

## API Integration Details

`lib/api.ts` namespaces:

- `authApi`
- `statsApi`
- `meetingsApi`
- `tasksApi`
- `helpApi`

Notable calls:

- `statsApi.leaderboard()` for team ranking matrix
- `tasksApi.githubSyncAll()` and `tasksApi.developerGithubSyncAll()`
- `tasksApi.aiSuggestStatus()`
- `helpApi.query()` for role-aware assistant

## Leaderboard on Developer Dashboard

The developer dashboard now shows full team ranking, not only personal metrics.

Columns:

- Rank
- Developer
- Total Tasks
- Completed
- Completion %
- GH Linked
- Avg Confidence
- Overall Score

Current user is highlighted with `(You)`.

Scoring formula:

`Score = (Completion Rate * 0.5) + (GitHub Linked * 5) + (Avg Task Confidence * 0.2)`

## AI Assistant Notes

- Manager assistant can access manager-wide summaries.
- Developer assistant is restricted to developer-safe scope.
- Command and Q&A modes are available in sidebar panel.

## Environment

Create `.env.local` in `frontend/`:

```bash
NEXT_PUBLIC_API_URL=http://172.31.112.12:8000
```

Use your own backend origin if different.

## Local Development

From `frontend/`:

```bash
npm install
npm run dev
```

Or from repo root:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

## Troubleshooting

### 1) Failed to fetch / ERR_CONNECTION_REFUSED

- Ensure backend is running and reachable from browser host.
- Prefer backend bind:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Confirm `NEXT_PUBLIC_API_URL` matches reachable backend host.

### 2) Next.js blocked dev resources (HMR/fonts)

Add LAN origin to `next.config.ts`:

```ts
allowedDevOrigins: ["172.31.112.12"]
```

Restart frontend dev server.

### 3) Hydration warnings from injected attributes

Some browser extensions inject form attributes (for example `fdprocessedid`) before hydration. The app root layout suppresses these extension-only mismatches.

## Build

```bash
npm run build
npm run start
```

## Future Improvements

- Remove remaining `any` types from dashboard and API models
- Introduce React Query/SWR for caching and invalidation
- Add integration tests for role-based routing and assistant visibility

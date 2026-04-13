# Automated Task Manager Frontend

Frontend for the Automated Task Manager system.
This UI is built for two roles:

- Manager: upload meetings, review/extract tasks, assign work, monitor team execution
- Developer: track assigned tasks, update progress, collaborate via task threads

The frontend communicates with the FastAPI backend over REST and uses header-based auth context.

## Tech Stack

- Framework: Next.js 16 (App Router)
- UI: React 19 + TypeScript
- Styling: global CSS design system (`app/globals.css`) with tokenized theme variables
- Linting: ESLint 9 + `eslint-config-next`
- Runtime API: browser `fetch` via centralized typed client (`lib/api.ts`)

## High-Level Design (HLD)

### 1) Architecture

- Client-rendered dashboard app (`"use client"` pages and components)
- Shared auth context persisted to `localStorage` (`lib/auth-context.tsx`)
- Centralized API layer (`lib/api.ts`) to isolate backend contract details
- Role-based navigation and redirects:
	- anonymous -> `/login`
	- manager -> `/dashboard/manager`
	- developer -> `/dashboard/developer`

### 2) Major Frontend Modules

- Auth Module
	- Login/signup flows, context hydration, logout
- Manager Module
	- Overview dashboard
	- Pending review and assignment
	- All tasks management
	- Meetings upload/extraction workspace
	- Team/developer management
- Developer Module
	- Personal dashboard
	- Personal task execution board
- Shared UI Module
	- Sidebar navigation, badges/stat widgets, toast notifications

### 3) Data Flow

1. User logs in from `/login`
2. Backend returns user identity and role
3. Auth context stores user in memory + `localStorage`
4. UI pages call APIs through `lib/api.ts` with `X-User-Id` and `X-User-Role`
5. UI updates local component state and shows transient feedback via toast system

## Low-Level Design (LLD)

### 1) Routing Structure

- `app/page.tsx`
	- boot redirect page (auth gate -> role route)
- `app/login/page.tsx`
	- login/signup form with client-side validation and API calls
- `app/dashboard/manager/*`
	- manager feature pages
- `app/dashboard/developer/*`
	- developer feature pages

### 2) Auth and Session State

File: `lib/auth-context.tsx`

- `AuthProvider` loads `atm_user` from `localStorage` on mount
- `setUser` writes/removes `atm_user`
- `logout` clears auth state and storage
- Any page can consume `useAuth()` for role-aware rendering/actions

### 3) API Client Contract Layer

File: `lib/api.ts`

- `request<T>()` wraps `fetch` and normalizes errors
- Adds role/user headers through `getHeaders(user)`
- API namespaces:
	- `authApi`
	- `statsApi`
	- `meetingsApi`
	- `tasksApi`

Notable task APIs:

- `githubSync`, `githubSyncAll`, `developerGithubSyncAll`
- `aiSuggestStatus`
- `getThread`, `appendNote`
- `updateStatus`, `updateFull`, `confirm`, `reject`

### 4) UI Composition

- `components/Sidebar.tsx`
	- role navigation shell + active state + logout
- `components/Badges.tsx`
	- status badge, priority badge, confidence bar, stat card
- `components/Toast.tsx`
	- lightweight local toast queue with auto-dismiss

### 5) Styling and Theme System

File: `app/globals.css`

- Theme tokens via CSS variables (`:root`)
- Shared primitives:
	- cards, buttons, forms, tables, badges, modals, tabs
- Layout model:
	- fixed sidebar + topbar + content container
- Gradient atmospheric background and orb layers via root layout

### 6) Role-Specific Screens (Detailed)

#### Manager Screens

- `dashboard/manager/page.tsx`
	- KPI cards, status/priority distribution, recent tasks
	- bulk GitHub sync action with loading/lock states
- `dashboard/manager/pending/page.tsx`
	- review extracted tasks
	- multi-assignee confirmation workflow
	- create developer from modal
- `dashboard/manager/tasks/page.tsx`
	- full task operations: filter/search/edit/delete/thread/github sync
	- AI status suggestion gated by thread availability
- `dashboard/manager/meetings/page.tsx`
	- upload transcript, trigger extraction, browse meeting history
- `dashboard/manager/team/page.tsx`
	- create developer and view current team

#### Developer Screens

- `dashboard/developer/page.tsx`
	- personal KPI summary + urgent items
	- own GitHub sync action
- `dashboard/developer/tasks/page.tsx`
	- status progression flow (confirmed -> in_progress -> done)
	- task details modal, thread updates, AI status suggestion

## Folder-Level Map

```text
frontend/
	app/
		layout.tsx            # Root layout + AuthProvider + global backdrop
		page.tsx              # Entry redirect
		login/page.tsx        # Login + signup
		dashboard/
			manager/...         # Manager pages
			developer/...       # Developer pages
	components/
		Sidebar.tsx
		Badges.tsx
		Toast.tsx
	lib/
		api.ts                # Backend API contracts
		auth-context.tsx      # Client auth/session context
	app/globals.css         # Theme + global component styles
```

## Small but Important Implementation Details

- Header-based auth on every protected API call:
	- `X-User-Id`
	- `X-User-Role`
- Error normalization:
	- backend `detail` is converted to thrown JS `Error` for consistent UI handling
- Thread UX:
	- message count indicator appears only when messages exist
	- AI status suggestion enabled only when thread history exists
- GitHub sync UX:
	- sync buttons stay visible
	- loading state during request
	- disabled/synced state after success to prevent re-trigger spam
- Scroll UX:
	- long meeting/developer lists scroll inside card containers

## Environment Configuration

- `NEXT_PUBLIC_API_URL`
	- Optional
	- Defaults to `http://localhost:8000`
	- Example:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Run Locally

From `frontend/`:

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

If running from monorepo root:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

## Build and Lint

```bash
npm run lint
npm run build
npm run start
```

## Backend Dependency (Contract)

This frontend expects the FastAPI backend to expose endpoints under `/api/*`, including:

- `/api/auth/*`
- `/api/stats/*`
- `/api/meetings/*`
- `/api/tasks/*`

For full backend setup, run backend service first and then start this frontend.

## Future Improvement Ideas

- Replace `any` task models with strict TypeScript interfaces
- Add request abort/cancel support for long operations
- Add React Query/SWR for caching and automatic revalidation
- Add route-level guards via middleware for stricter client navigation control

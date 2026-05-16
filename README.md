# TaskFlow — Team Task Manager

A collaborative task management app built with **React + Vite + Supabase**.

Frontend and backend live in a single project: the React app talks to Supabase directly. Authentication, the database, and row-level security all run inside Supabase — no Node server to deploy.

---

## Features

- Email/password authentication via Supabase Auth
- Projects, members, tasks (To Do / In Progress / Done)
- Priorities (low/medium/high), due dates, overdue detection
- Dashboard with status, priority, overdue and per-user breakdowns
- Role-based access enforced by **Postgres Row Level Security** — not just the UI
- Multiple themes, light + dark modes

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Auth + DB | Supabase (Postgres + Auth + RLS) |
| Styling | Hand-rolled CSS with theme tokens |

---

## Setup (one-time)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**. Pick a name, a strong DB password, and a region close to you.
3. Wait ~1 minute for the project to provision.

### 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Open [`supabase/schema.sql`](./supabase/schema.sql) from this repo and paste the contents into the SQL editor.
3. Click **Run**. This creates the `profiles`, `projects`, `project_members`, `tasks` tables, the RLS policies, the auth trigger that creates a profile row on signup, and the `update_task_status` RPC.

You can run this script again any time — it's idempotent.

### 3. (Recommended) Turn off email confirmations for local dev

In **Authentication → Providers → Email**, disable **Confirm email** so signups log you in immediately. Re-enable it before going to production.

### 4. Get your keys

In **Project Settings → API**, copy:

- **Project URL** (e.g. `https://abcdefgh.supabase.co`)
- **anon public** key

### 5. Configure the app

Copy `.env.example` to `.env` and fill in the values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=TaskFlow
VITE_APP_ENV=production
```

### 6. Install & run

```bash
npm install
npm run dev
```

Open <http://localhost:5173>, sign up, and you're in.

---

## Promoting a user to global admin

Every new signup defaults to the `tasker` role. A `tasker` can create projects (they become that project's admin) and manage tasks they're assigned. A **global admin** sees every project and every task in the workspace.

To promote yourself, run this once in **Supabase → SQL Editor**:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## Role-based permissions (enforced by RLS)

| Action | Project admin | Project member | Global admin |
|--------|:-------------:|:--------------:|:------------:|
| View project + tasks | ✅ | ✅ | ✅ (all) |
| Create project | ✅ (becomes admin) | ✅ (becomes admin) | ✅ |
| Edit/delete project | ✅ | ❌ | ✅ |
| Add/remove members | ✅ | ❌ | ✅ |
| Create tasks | ✅ | ✅ | ✅ |
| Edit task (title/priority/assignee/due) | ✅ | ❌ | ✅ |
| Change task status | ✅ | ✅ if assignee | ✅ |
| Delete task | ✅ | ❌ | ✅ |

Project members who are also the task's assignee can change status via the `update_task_status` RPC — they cannot UPDATE the tasks table directly.

---

## Project structure

```
.
├── index.html                # Vite entry HTML
├── package.json              # Single root package (no backend/frontend split)
├── vite.config.js
├── .env.example              # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_NAME, VITE_APP_ENV
├── public/                   # Static assets
├── supabase/
│   └── schema.sql            # Tables + RLS + auth trigger + RPC
└── src/
    ├── main.jsx              # React root
    ├── App.jsx               # Layout + view router
    ├── supabase.js           # Supabase client + APP_NAME/APP_ENV
    ├── db.js                 # All data-access functions (Supabase queries wrapped for the UI)
    ├── AuthContext.jsx       # Supabase Auth integration
    ├── ThemeContext.jsx      # Theme switcher
    ├── LoginPage.jsx
    ├── SignupPage.jsx
    ├── AuthGraphic.jsx
    ├── Sidebar.jsx
    ├── Dashboard.jsx
    ├── ProjectsPage.jsx
    ├── ProjectDetail.jsx
    ├── MyTasksPage.jsx
    ├── TaskModal.jsx
    └── index.css             # Full design system
```

---

## Building for production

```bash
npm run build
```

The output goes to `dist/`. Host it on any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3 + CloudFront, Supabase static hosting, etc.) — the runtime only needs the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars to be set at **build** time.

Remember to re-enable **Confirm email** in Supabase before opening signups to the public.

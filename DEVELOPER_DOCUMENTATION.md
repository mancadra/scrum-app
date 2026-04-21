# Developer Documentation – Scrum App

## Table of Contents
1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Environment Variables](#4-environment-variables)
5. [Architecture Overview](#5-architecture-overview)
6. [Database Schema](#6-database-schema)
7. [Services](#7-services)
8. [Hooks](#8-hooks)
9. [Pages & Components](#9-pages--components)
10. [Routing & Access Control](#10-routing--access-control)
11. [Supabase Edge Functions](#11-supabase-edge-functions)
12. [Testing](#12-testing)
13. [Database Scripts](#13-database-scripts)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Build tool | Vite 7 |
| Routing | React Router DOM 7 |
| Backend / Database | Supabase (PostgreSQL + Auth) |
| Icons | Lucide React |
| Testing | Vitest |
| Linting | ESLint 9 |
| Serverless functions | Supabase Edge Functions (Deno) |

---

## 2. Project Structure

```
scrum-app/
├── db/
│   ├── clear_everything_in_db.sql   # Wipe all data (keep lookup tables)
│   └── seed_demo_data.sql           # Demo seed data for presentations
├── supabase/
│   └── functions/
│       └── create-user/
│           └── index.ts             # Edge function: admin user creation
├── src/
│   ├── config/
│   │   └── supabase.js              # Supabase client instance
│   ├── services/                    # All database/API calls
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── projects.js
│   │   ├── sprints.js
│   │   ├── stories.js
│   │   ├── tasks.js
│   │   └── productBacklog.js
│   ├── hooks/                       # Shared React hooks
│   │   ├── useAuth.js
│   │   ├── useStories.js
│   │   └── useTasks.js
│   ├── pages/                       # Top-level route components
│   │   ├── LoginPage.jsx / .css
│   │   ├── AdminPage.jsx / .css
│   │   ├── CreateProjectPage.jsx / .css
│   │   ├── TOBEDELETEDProductBacklogPage.jsx
│   │   └── SprintPage.jsx / .css
│   ├── components/                  # Reusable UI components
│   │   ├── NavbarComponent.jsx / .css
│   │   ├── AddSprintComponent.jsx / .css
│   │   ├── BacklogStoryComponent.jsx
│   │   ├── BacklogSprintEntryComponent.jsx
│   │   ├── TOBEDELETEDProductBacklog.jsx / .css
│   │   ├── ProjectPageComponent.jsx / .css
│   │   ├── ProjectPageBacklogComponent.jsx / .css
│   │   ├── ProjectPageSprintComponent.jsx / .css
│   │   ├── TOBEDELETEDTaskCard.jsx / .css
│   │   ├── TaskForm.jsx / .css
│   │   ├── UserStoryForm.jsx / .css
│   │   ├── TOBEDELETEDStorypoint.jsx / .css
│   │   ├── TOBEDELETEDFirstTimeLoginPage.jsx / .css
│   │   └── TOBEDELETEDDummySprintListComponent.jsx / .css
│   ├── tests/
│   │   ├── unit/                    # Unit tests per service
│   │   └── integration/             # Integration tests
│   ├── App.jsx / App.css            # Root component, routing, global state
│   ├── main.jsx                     # Entry point, BrowserRouter wrapper
│   └── index.css                    # Global styles
├── .env.local                       # Environment variables (not committed)
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## 3. Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the schema applied

### Install dependencies
```bash
npm install
```

### Set up environment variables
Create a `.env.local` file in the project root (see [section 4](#4-environment-variables)).

### Run the development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run tests
```bash
npm test
```

---

## 4. Environment Variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are found in the Supabase dashboard under **Project Settings → API**.

> These variables are embedded at build time by Vite via `import.meta.env`. Never commit `.env.local` to version control.

---

## 5. Architecture Overview

The app follows a **service-layer architecture**:

```
Page / Component
      │
      ▼
   Hook (optional)          ← shared stateful logic (useAuth, useStories, useTasks)
      │
      ▼
   Service                  ← all Supabase queries live here
      │
      ▼
  Supabase Client           ← src/config/supabase.js
      │
      ▼
  Supabase (PostgreSQL + Auth)
```

**Rules:**
- Pages and components **never** query Supabase directly — they call service functions.
- Hooks wrap service calls with `useState`/`useEffect` for shared reactive data.
- Global state (current user, selected project, sprints, stories) lives in `App.jsx` and is passed down as props.

---

## 6. Database Schema

### Lookup tables (never cleared)
| Table | Values |
|---|---|
| `Roles` | `Admin`, `User` |
| `ProjectRoles` | `Product Owner`, `Scrum Master`, `Developer` |
| `Priorities` | `Must have`, `Should have`, `Could have`, `Won't have this time` |

### Data tables

| Table | Key columns |
|---|---|
| `Users` | `id` (uuid, FK→auth.users), `username`, `name`, `surname`, `email`, `lastLogin`, `currentLogin` |
| `UserRoles` | `FK_userId`, `FK_roleId` |
| `Projects` | `id`, `name`, `description` |
| `ProjectUsers` | `FK_userId`, `FK_projectId`, `FK_projectRoleId` |
| `Sprints` | `id`, `startingDate`, `endingDate`, `startingSpeed`, `FK_projectId` |
| `UserStories` | `id`, `name`, `description`, `businessValue`, `FK_priorityId`, `accepted`, `realized`, `timeComplexity`, `FK_projectId` |
| `AcceptanceTests` | `id`, `description`, `FK_userStoryId` |
| `SprintUserStories` | `FK_sprintId`, `FK_userStoryId` |
| `Tasks` | `id`, `description`, `timecomplexity`, `remaininghours`, `finished`, `FK_userStoryId`, `FK_proposedDeveloper`, `FK_acceptedDeveloper` |
| `TimeTables` | `id`, `starttime`, `stoptime`, `FK_userId`, `FK_taskId` |
| `UserStoryComments` | `id`, `content`, `createdAt`, `FK_userId`, `FK_userStoryId` |
| `WallPosts` | `id`, `content`, `created_at`, `responseTo`, `FK_projectId`, `FK_userId` |
| `Documentation` | `id`, `content`, `FK_projectId` |

### Key relationships
- A **Task** is unassigned when `FK_acceptedDeveloper` is NULL, assigned when set, and active when it also has an open `TimeTables` row (`stoptime` IS NULL).
- A **UserStory** is realized when `realized=true` and accepted when `accepted=true`.
- A story is in a sprint via the `SprintUserStories` junction table.

---

## 7. Services

All service files live in `src/services/`. Each exports plain async functions.

### `auth.js`
| Function | Description |
|---|---|
| `signIn(username, password)` | Looks up email by username, authenticates via Supabase Auth, updates `lastLogin` |
| `signOut()` | Signs out the current session |
| `getCurrentUser()` | Returns user profile + roles from DB |
| `changePassword(oldPassword, newPassword)` | Password change for logged-in users |
| `changePasswordAnon(username, oldPassword, newPassword)` | Password change from the login page (not logged in) |
| `validatePassword(password)` | Enforces rules: 12–128 chars, no consecutive spaces, not in top-100 list |

### `users.js`
| Function | Description |
|---|---|
| `getAllUsers()` | Returns all users (admin use) |
| `getUserById(id)` | Returns single user profile |
| `updateUser(id, data)` | Updates user profile fields |
| `deleteUser(id)` | Deletes user and auth account |

### `projects.js`
| Function | Description |
|---|---|
| `createProject(name, description, members)` | Creates project + inserts ProjectUsers; enforces exactly 1 Product Owner and 1 Scrum Master |
| `getProjectsForUser(userId)` | Returns projects the user belongs to |
| `getProjectUsers(projectId)` | Returns members with their project roles |
| `updateProjectName(projectId, name)` | Renames a project; checks for duplicate names |
| `saveProjectMembers(projectId, desiredMembers)` | Batch-updates the full member list: diffs current vs desired state, applies inserts/deletes. Validates that exactly 1 Product Owner and 1 Scrum Master remain and all members have at least one role |
| `addProjectMember(projectId, userId, roleId)` | Inserts a row into `ProjectUsers`; blocks exclusive roles already held by another member |
| `removeProjectMember(projectId, userId)` | Deletes all `ProjectUsers` rows for that member; blocked if member is the sole Product Owner or Scrum Master |
| `removeProjectMemberRole(projectId, userId, roleId)` | Removes a single role from a member; blocked if it would leave the project with no Product Owner or no Scrum Master |
| `updateProjectMemberRole(projectId, userId, roleId)` | Updates the role of an existing project member |
| `getProjectRoles()` | Returns all rows from `ProjectRoles` lookup table |
| `getUsers()` | Returns all users (used to populate member-picker dropdowns) |

### `sprints.js`
| Function | Description |
|---|---|
| `createSprint(projectId, { startingDate, endingDate, startingSpeed })` | Validates dates/speed/overlap/weekend/holiday, then inserts. Scrum Master only |
| `getSprintsForProject(projectId)` | Returns all sprints ordered by start date descending |
| `editSprint(sprintId, { startingDate, endingDate, startingSpeed })` | Updates a sprint that hasn't started; same validations as create. Scrum Master only |
| `deleteSprint(sprintId)` | Removes `SprintUserStories` entries first (stories return to backlog, time logs preserved), then deletes the sprint. Scrum Master only |

**Shared validation helpers (internal):**
- `checkNotWeekend(date)` — throws if the date falls on Saturday or Sunday
- `checkNotHoliday(date)` — fetches Slovenian public holidays from `date.nager.at` API and throws if the date matches
- `checkSprintEditable(sprintId, userId)` — verifies the sprint hasn't started and the caller is a Scrum Master

### `stories.js`
| Function | Description |
|---|---|
| `createStory(projectId, data)` | Inserts a new UserStory with acceptance tests |
| `getStoriesForProject(projectId)` | Returns all stories with priority and sprint assignments |
| `updateStory(storyId, data)` | Updates story fields (blocked if in sprint or realized) |
| `deleteStory(storyId)` | Deletes story (blocked if in sprint or realized) |
| `setTimeComplexity(storyId, value)` | Sets time complexity (blocked if already in sprint) |
| `realizeStory(storyId)` | Marks story as realized (`accepted=true`, `realized=true`) |
| `rejectStory(storyId, comment)` | Returns story to backlog, adds comment |

### `tasks.js`
| Function | Description |
|---|---|
| `createTask(storyId, data)` | Creates task under a story in the active sprint |
| `updateTask(taskId, data)` | Updates task description/estimate |
| `deleteTask(taskId)` | Deletes task (blocked if already accepted) |
| `acceptTask(taskId, userId)` | Sets `FK_acceptedDeveloper` |
| `finishTask(taskId)` | Sets `finished=true` |
| `startWork(taskId, userId)` | Inserts open TimeTables row (`stoptime` NULL) |
| `stopWork(taskId, userId)` | Closes open TimeTables row (sets `stoptime`) |

### `wallPosts.js`
| Function | Description |
|---|---|
| `getWallPosts(projectId)` | Returns top-level posts (no comments) with author info, newest first. Project members only |
| `getCommentsForPost(postId)` | Returns all comments for a post with author info, oldest first. Project members only |
| `createWallPost(projectId, content)` | Creates a top-level post. Project members only |
| `createWallComment(postId, content)` | Creates a comment on a post (`responseTo = postId`). Project members only; cannot comment on comments |
| `deleteWallPost(postId)` | Deletes all comments first, then the post. Scrum Master or Admin only |
| `deleteWallComment(commentId)` | Deletes a single comment. Scrum Master or Admin only |

### `productBacklog.js`
| Function | Description |
|---|---|
| `getBacklog(projectId)` | Returns stories grouped into realized / assigned / unassigned |

---

## 8. Hooks

### `useAuth.js`
```js
const { user, loading, isAdmin, isDeveloper, refreshUser } = useAuth()
```
Fetches the current user on mount. Exposes boolean role flags derived from `UserRoles`. Call `refreshUser()` after profile updates.

### `useStories.js`
```js
const { stories, loading, refresh } = useStories(projectId)
```
Fetches user stories for the given project.

### `useTasks.js`
```js
const { tasks, loading, refresh } = useTasks(sprintId)
```
Fetches tasks for the active sprint, grouped by status.

---

## 9. Pages & Components

### Pages

| Page | Route | Access |
|---|---|---|
| `LoginPage` | `/login` | Public |
| `AdminPage` | `/admin` | Administrator only |
| `CreateProjectPage` | `/create-project` | Administrator only |
| `TOBEDELETEDProductBacklogPage` | `/project/:projectId/backlog` | Project members |
| `SprintPage` | `/project/:projectId/sprint/:sprintId` | Project members |
| `ProjectPageComponent` | `/` | Authenticated |

### Key Components

| Component | Responsibility |
|---|---|
| `NavbarComponent` | Top navigation, project selector, logout |
| `ProjectPageComponent` | Project landing page; renders Backlog + Sprint columns and the footer action bar. Shows the **NASTAVITVE PROJEKTA** button when the current user is a **Scrum Master** (project role) **or** a system **Admin**. |
| `ProjectPageBacklogComponent` | Product Backlog panel: story list, add/edit/delete story, time complexity input |
| `ProjectPageSprintComponent` | Sprint list panel: create sprint, open sprint settings |
| `ProjectPageSettingsModalComponent` | Modal for renaming a project and managing its members (add, remove, change roles). All edits are staged locally; a single **Shrani spremembe** button at the bottom (sticky) validates and saves everything. Enforces exactly 1 Product Owner and 1 Scrum Master. Accessible to Scrum Masters and system Admins |
| `ProjectPageSprintSettingsModalComponent` | Modal for editing or deleting a sprint that has not yet started. Uses native `type="date"` inputs |
| `ProjectPageWallComponent` | Project wall: grid of post cards, create post modal, post detail modal with comments and comment form. Loads `canDelete` on mount (Scrum Master or Admin) to conditionally show delete controls |
| `ProjectPageWallPostComponent` | Single wall-post card; when `canDelete` is true, shows a 🗑️ action button (top-right, visible on hover) following the same pattern as `BacklogStoryComponent` |
| `BacklogStoryComponent` | Single story card with inline time complexity input |
| `BacklogStoryDetailsComponent` | Story detail panel: edit/delete story, acceptance tests, comments, confirm/reject buttons |
| `UserStoryForm` | Create/edit story modal (name, description, priority, business value, acceptance tests) |
| `AddSprintComponent` | Sprint creation form with date and speed validation |
| `BacklogSprintEntryComponent` | Sprint entry row in the sprint list |
| `TaskForm` | Create/edit task form |
| `BurndownChartComponent` | SVG burndown chart for a sprint (ideal vs actual lines) |
| `PasswordMeter` | Password strength indicator shown during registration/password change |
| `MFASetup` | TOTP multi-factor authentication enrollment UI |

---

## 10. Routing & Access Control

Routing is set up in `App.jsx` using React Router v7. `main.jsx` wraps everything in `<BrowserRouter>`.

**Role checks** are done via `useAuth()`:
- `isAdmin` — system-level Administrator role (`Roles.name === 'Admin'`)
- `isDeveloper` — Developer project role

Sensitive routes redirect to `/login` if the user is not authenticated, or show an error if they lack the required role.

The selected project is persisted in `localStorage` so it survives page refreshes.

### Project management permission (`canManageProject`)

`ProjectPageComponent` derives `canManageProject` on mount by calling both `getCurrentUser()` and `getProjectRolesForUser()`:

```js
const isAdmin = currentUser?.profile?.UserRoles?.some(r => r.Roles?.name === 'Admin') ?? false;
const roles   = await getProjectRolesForUser(project.id, currentUser?.id);
setCanManageProject(isAdmin || roles.includes('Scrum Master'));
```

This means the **NASTAVITVE PROJEKTA** button (and the `ProjectPageSettingsModalComponent` it opens) is shown to:
- Any user with the **Scrum Master** project role on that specific project, **or**
- Any user with the system-level **Admin** role (regardless of project membership).

> Do not rely solely on project-role checks when the action should also be available to system Admins. Always combine both checks as shown above.

---

## 11. Supabase Edge Functions

### `create-user` (`supabase/functions/create-user/index.ts`)

A Deno-based serverless function invoked when an admin creates a new user, because creating auth users requires the **service role key** (which must never be exposed to the client).

**Flow:**
1. Receives `POST` with `{ username, email, password, name, surname, role }`.
2. Verifies the requesting user is an Administrator via JWT.
3. Validates the password server-side (same rules as the frontend).
4. Creates the Supabase Auth user.
5. Inserts a row into `public.Users`.
6. Assigns the system role via `public.UserRoles`.
7. On any error, rolls back created records.

**Deploy:**
```bash
supabase functions deploy create-user
```

---

## 12. Testing

Tests live in `src/tests/` and run with Vitest.

```bash
npm test              # run all tests
npm test -- --watch   # watch mode
```

### Unit tests (`src/tests/unit/`)
One file per service. Test individual service functions in isolation (mocking the Supabase client).

| File | Tests |
|---|---|
| `auth.test.js` | signIn, validatePassword, changePassword |
| `users.test.js` | CRUD operations |
| `projects.test.js` | createProject, getProjectsForUser |
| `sprints.test.js` | date/speed validation, overlap detection |
| `stories.test.js` | createStory, setTimeComplexity, guards |
| `tasks.test.js` | acceptTask, finishTask, guards |
| `productBacklog.test.js` | getBacklog categorization |

### Integration tests (`src/tests/integration/`)
Test flows across multiple services against a real (test) Supabase instance.

| File | Tests |
|---|---|
| `auth.test.js` | Full login/logout flow |
| `projects.test.js` | Project creation with members |
| `stories.test.js` | Story lifecycle (create → assign → realize) |
| `tasks.test.js` | Task lifecycle (create → accept → finish) |
| `sprintBacklog.test.js` | Sprint backlog category correctness |

---

## 13. Database Scripts

Located in `db/`:

| File | Purpose |
|---|---|
| `clear_everything_in_db.sql` | Deletes all data from all data tables (preserves lookup tables: `Roles`, `ProjectRoles`, `Priorities`). Also clears `auth.users`. Run this before seeding. |
| `seed_demo_data.sql` | Inserts demo users, one project, three sprints, eight user stories, five tasks, and timetable entries covering all Sprint Backlog and Product Backlog categories. Password for all demo users: `testpassword123!` |

### Demo users after seeding

| Username | Role | Project role |
|---|---|---|
| `admin` | Administrator | — |
| `manca.drascek` | User | Scrum Master |
| `marko.pozenel` | User | Product Owner |
| `grega.radez` | User | Developer |
| `vito.verdnik` | User | Developer |
| `anze.judez` | User | Developer |
| `random` | User | (not on project) |

### Running the scripts
Execute both files sequentially in the **Supabase SQL Editor** (Dashboard → SQL Editor):
1. `clear_everything_in_db.sql`
2. `seed_demo_data.sql`

# Scrum App

A Scrum project management tool built with React, Vite, and Supabase.


## Link to live demo
https://scrum-app-4mwh.onrender.com/

## Prerequisites

- Node.js (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for deploying edge functions)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Supabase**

   Create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Deploy edge functions** (required for user creation)
   ```bash
   supabase functions deploy create-user
   ```

## Running the app

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Running tests

```bash
npm test
```

Integration tests require a valid Supabase connection and a seeded test user (`testuser01`).

## Build

```bash
npm run build
```

## Tech stack

- **Frontend:** React 19, React Router
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Testing:** Vitest
- **Bundler:** Vite

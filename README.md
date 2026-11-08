# SchoolSync

School management system: attendance, marks, fees and UDISE+ export.

## Deploy without a terminal (GitHub + Vercel)
1. Upload all files of this folder to a new GitHub repo (Add file > Upload files).
2. Supabase Dashboard > SQL Editor: run `supabase/migrations/001_core_schema.sql`.
3. Supabase > Authentication > Users > Add user. Copy the UID, put it in `002_first_admin.sql`, run it in SQL Editor.
4. vercel.com > Add New Project > import the GitHub repo. Before deploying, add Environment Variables:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase > Project Settings > API).
5. Deploy. Open the Vercel link and sign in.

Every time you upload changed files to GitHub, Vercel rebuilds automatically.

## Run locally (optional)
`npm install`, copy `.env.example` to `.env`, `npm run dev`.

See `docs/PROGRESS.md` for status and next steps.

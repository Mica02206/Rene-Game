# Rene Game

Rene Game is split into small, labeled feature folders. Serve the project over localhost or HTTPS so the browser can load ES modules.

## Project layout

```text
ReneGame/
├── index.html
├── README.md
├── assets/
│   ├── basketball.png
│   └── mama-rene-baterbonia.mp3
├── styles/
│   └── main.css
├── scripts/
│   ├── app.js
│   ├── shared/
│   │   └── supabase.js
│   └── features/
│       ├── auth/auth.js
│       ├── game/game.js
│       ├── leaderboard/leaderboard.js
│       ├── profile/profile.js
│       ├── scores/scores.js
│       └── settings/settings.js
└── supabase/
    ├── database/setup.sql
    └── functions/delete-account/index.ts
```

## Supabase setup

1. Create a Supabase project and enable Email auth.
2. Copy the Project URL and publishable key from **Project Settings → API** into `scripts/shared/supabase.js`.
3. Run `supabase/database/setup.sql` once in the Supabase SQL Editor. It creates profiles, row-level security policies, signup profile creation, the atomic score-saving RPC, and the Realtime publication.
4. In **Edge Functions**, deploy a function named `delete-account`. Copy the code from `supabase/functions/delete-account/index.ts` into the Dashboard editor and click **Deploy function**. The function uses the server-side service role key provided by Supabase; never put that key in browser code.

5. From this folder, start a local web server, for example `py -m http.server 8000`, then open `http://localhost:8000`.

## Feature modules

- **Auth** — email/password sign-up, login, session, logout.
- **Profile** — personal best, total points, reset progress.
- **Leaderboard** — realtime top ten.
- **Game** — canvas rendering, physics, hoops, collision, swish scoring.
- **Scores** — atomic score persistence through a Postgres function.
- **Settings** — progress reset and account deletion.

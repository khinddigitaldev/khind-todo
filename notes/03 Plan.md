# 03 Plan — build steps

Comes from [[02 Spec]]. Each step ends with something you can check. ✅ = done in the reference build.

| # | Step | Who | Check | Lesson |
|---|---|---|---|---|
| 1 ✅ | Install tools, create accounts | You | All versions print | [[L0 Setup - accounts and installs]] |
| 2 ✅ | Write idea + spec in Obsidian | You + Claude | [[01 Idea]], [[02 Spec]] exist | [[L1 Obsidian - the project notebook]], [[L2 Design - from idea to spec]] |
| 3 ✅ | Scaffold Next.js app | Claude | `npm run dev` shows a page | [[L4 Next.js - the app skeleton]] |
| 4 ✅ | Write tests first for input checks, then the code | Claude | `npm test` green | [[L6 Build - login and todos]] |
| 5 ✅ | Supabase helpers, proxy, login page, todo page, actions | Claude | `npm run build` passes | [[L6 Build - login and todos]] |
| 6 ✅ | CI workflow, README, `.env.example` | Claude | Files exist | [[L3 GitHub - repo and first push]] |
| 7 ✅ | Create public GitHub repo and push | Claude (via `gh`) | Repo visible; CI green | [[L3 GitHub - repo and first push]] |
| 8 ✅ | Create Supabase project, run `schema.sql`, turn off email confirmation | You | Table `todos` with RLS on | [[L5 Supabase - database and login]] |
| 9 ✅ | Put keys in `.env.local`, test locally | You | Sign up, add/tick/delete works | [[L6 Build - login and todos]] |
| 10 | Import repo in Vercel, add env vars, deploy | You | Live URL works | [[L7 Vercel - go live]] |
| 11 | Set Supabase Site URL to the Vercel URL | You | | [[L7 Vercel - go live]] |
| 12 | Make a small change, push, watch it redeploy | You + Claude | Change visible live | [[L8 Ship a change - push to deploy]] |

Record anything surprising in [[Log]].

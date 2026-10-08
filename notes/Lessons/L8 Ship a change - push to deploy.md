# L8 Ship a change — push to deploy

**Goal:** feel the full loop: note → code → GitHub → Vercel → live, in minutes. ⏱ 20 min

## The loop

```
Write the change in Obsidian  →  Claude Code builds it  →  commit + push to GitHub
        ▲                                                         │
        │                                       CI checks ✓ + Vercel redeploys
        └──────────── write what you learned in Log ◄──── live URL updated
```

## Exercise: show the date each todo was added

1. In Obsidian, add to [[02 Spec]] under *Screens*: "Each todo shows the date it was added, e.g. *8 Oct*."
2. 💬 *"Read notes/02 Spec.md — I added a line under Screens. Implement it, run lint, typecheck, tests and build, then commit and push."*
3. On GitHub → **Actions**: CI runs. On Vercel → **Deployments**: a new build starts by itself.
4. Refresh your live URL → dates appear.

## Safer: use a branch + Pull Request

1. 💬 *"Create a branch, make the change, push it, and open a pull request."*
2. Vercel gives the PR its own **Preview URL** — try the change there first.
3. CI must be green ✓. Then **Merge** on GitHub → production updates.

## More practice ideas

- Edit a todo's text (needs an `update` action — RLS already allows it).
- "Clear completed" button.
- Show a count of done vs. total.

## You did it

You used all four tools the way real teams do:
- **Obsidian** to think and decide,
- **GitHub** to store and check,
- **Supabase** for data and login,
- **Vercel** to ship.

Write your reflections in [[Log]].

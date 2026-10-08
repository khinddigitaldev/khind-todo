# L2 Design — from idea to spec

**Goal:** turn the idea into a written design (spec) *before* any code. ⏱ 30 min

## Why design first?

Changing a sentence is free; changing code that's already built is expensive. A spec also tells Claude exactly what to build, so it doesn't guess.

## Steps

1. Open Claude Code in your project folder (`khind-todo`).
2. 💬 *"Read notes/01 Idea.md. Help me design this MVP. Ask me one question at a time, then propose 2–3 approaches with your recommendation. Tools: Obsidian (notes), GitHub, Supabase, Vercel."*
3. Answer its questions. Typical ones:
   - Which framework? (we chose **Next.js**)
   - Where do notes live? (**inside the repo**)
   - Public or private repo? (**public**)
4. When you agree, 💬 *"Write the agreed design to notes/02 Spec.md and a step-by-step build plan to notes/03 Plan.md."*
5. Read both in Obsidian. Change anything you don't like — it's your design.

## A good spec answers

- What are we building, and what are we **not** building?
- Which tools/frameworks, and why?
- What data do we store? (tables and columns)
- What can go wrong, and what does the user see then?
- How do we test it?

Compare with [[02 Spec]] and [[03 Plan]].

## What you should see

Three notes in your vault — Idea, Spec, Plan — linked to each other.

Next: [[L3 GitHub - repo and first push]]

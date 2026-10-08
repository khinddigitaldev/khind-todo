# L1 Obsidian — the project notebook

**Goal:** a notes vault that will live inside your code project, with your first note: the idea. ⏱ 15 min

## Why Obsidian?

Obsidian notes are plain Markdown (`.md`) files in a normal folder. That means:
- GitHub can store them next to your code, with full history.
- Claude Code can read and write them — your spec becomes something the AI follows.
- `[[Links]]` between notes turn them into a map of your project.

## Steps

1. Make a project folder, e.g. `C:\Github\khind-todo`, and inside it a folder `notes`.
2. Obsidian → **Open folder as vault** → choose `khind-todo\notes`.
3. Create a note **01 Idea**. Answer four questions:
   - What is it, in one sentence?
   - Who is it for?
   - What must it do? (5–6 bullet points max)
   - How will we know it worked?
4. Add a **00 Start Here** note that links to it: type `[[01 Idea]]`.

Compare yours with [[01 Idea]].

## Markdown in 60 seconds

| Type | Get |
|---|---|
| `# Title` | big heading |
| `**bold**` | **bold** |
| `- item` | bullet |
| `[[Note name]]` | link to another note |
| `` `code` `` | `code` |

## What you should see

A vault with two notes, and clicking the link in *00 Start Here* opens *01 Idea*.

> Tip: Obsidian creates a hidden `.obsidian` settings folder. Our `.gitignore` skips the personal layout files in it.

Next: [[L2 Design - from idea to spec]]

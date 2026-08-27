# Working Memory System

This directory provides a lightweight memory system for the **Self-Service Repository Request** platform. It records discoveries, decisions, patterns, and lessons relevant to this system to help engineers and AI assistants maintain context across sessions.

## Files

| File | Purpose | Committed? |
|------|---------|------------|
| `README.md` | This file — explains the memory system | ✅ Yes |
| `session-notes.md` | Completed session summaries and outcomes | ✅ Yes |
| `patterns-discovered.md` | Reusable patterns, decisions, and lessons | ✅ Yes |
| `scratch/working-notes.md` | Active-session notes and in-progress work | ❌ No (git-ignored) |

## Structure

```
.github/memory/
├── README.md
├── session-notes.md
├── patterns-discovered.md
└── scratch/
    ├── .gitignore
    └── working-notes.md   ← not committed
```

## How to Use

### During Active Work
- Use `scratch/working-notes.md` to capture current hypotheses, blockers, observations, and small tests. This file is git-ignored — it will not pollute the permanent record.

### After a Meaningful Discovery
- Add broadly reusable findings (e.g., how the issue parser works, a GitHub Actions pattern, a Terraform gotcha) to `patterns-discovered.md`.

### After Completing a Feature or Session
1. Summarise what changed, which decisions were made, and what future contributors should know → `session-notes.md`.
2. Move durable patterns from scratch → `patterns-discovered.md`.
3. Clear `scratch/working-notes.md` for the next session.

## Guidance for AI Assistants

Before suggesting changes:
1. Read `.github/copilot-instructions.md` for foundational context.
2. Check `patterns-discovered.md` for relevant constraints and examples.
3. Check `session-notes.md` for recent history.
4. Check `scratch/working-notes.md` for active in-progress work.

Treat memory as **project context, not unquestionable truth**. Verify old conclusions against current code, update stale patterns, and record new durable findings in the appropriate committed file.

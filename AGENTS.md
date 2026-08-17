## Monorepo engineering standards (`1-projects`)

This project lives under the **`1-projects`** monorepo. Before substantive code or documentation changes, **locate the monorepo root** by walking up parent directories until you find **`ENGINEERING_GUIDELINES_VERBATIM.md`**, then:

1. Read and follow **`ENGINEERING_GUIDELINES_VERBATIM.md`** (canonical standards for humans and all agents).
2. Apply **`.cursor/rules/*.mdc`** from that root (treat as binding project standards; YAML frontmatter may be skipped outside Cursor).
3. Maintain `.codebase-graph/` per `agent-codebase-graph.mdc`: retrieve from it, and refresh it in the **same turn** after every change. Skipping is a deviation — ask first.
4. Optional review workflow: **`.cursor/skills/grill-me/SKILL.md`** at that root.

If `ENGINEERING_GUIDELINES_VERBATIM.md` cannot be found (standalone checkout), ignore this section.

When adding **another** new project under `1-projects`, add **`CLAUDE.md`** and **`AGENTS.md`** at its root and include this same section.

---

## mycalendar

Personal month-page calendar. Keep the UI paper-like. Two password-gated calendars (`gautham` and `wife`) with isolated notes. Do not add accounts, sharing, or paid services unless asked. Persistence is Netlify Blobs.

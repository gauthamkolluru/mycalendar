## Monorepo engineering standards (`1-projects`)

This project lives under the **`1-projects`** monorepo. Before substantive code or documentation changes, **locate the monorepo root** by walking up parent directories until you find **`ENGINEERING_GUIDELINES_VERBATIM.md`**, then:

1. Read and follow **`ENGINEERING_GUIDELINES_VERBATIM.md`** (canonical standards for humans and all agents).
2. Apply **`.cursor/rules/*.mdc`** from that root (treat as binding project standards; YAML frontmatter may be skipped outside Cursor).
3. Optional review workflow: **`.cursor/skills/grill-me/SKILL.md`** at that root.

If `ENGINEERING_GUIDELINES_VERBATIM.md` cannot be found (standalone checkout), ignore this section.

When adding **another** new project under `1-projects`, add **`CLAUDE.md`** and **`AGENTS.md`** at its root and include this same section.

---

## mycalendar

Personal desk-calendar web app. Opens on the current month. Notes are stored per day via a Netlify Function and Netlify Blobs.

- Tests: `npm test`
- Local app: `npx netlify-cli dev` (needed for the API and Blobs)
- Production host: Netlify free tier at `calendar.thegauthams.com`
- Required env: `CALENDAR_GAUTHAM_PASSWORD`, `CALENDAR_WIFE_PASSWORD`, `CALENDAR_SESSION_SECRET` (32+ characters)

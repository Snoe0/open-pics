# S3 File Tagging — MVP Plan

Digital asset management tool (pics.io-inspired). Dark mode, sharp corners, sleek.

## Locked decisions
- **Stack**: Next.js (App Router, TypeScript) + Tailwind CSS
- **Auth/DB**: Supabase (one project = auth + Postgres + pgvector)
- **Storage**: Admin's own AWS S3 bucket (plug-and-play)
- **AI**: OpenAI API — Vision for auto-tagging, embeddings for natural-language search
- **Credentials**: environment variables (`.env.local`) — AWS keys, S3 bucket/region, OpenAI key, Supabase URL/keys
- **Run target**: local dev only for now
- **MVP scope**: folders + upload + previews, manual + AI tagging, tag + NL search, duplicate detection, team management/roles

## Architecture

### Database (Supabase Postgres)
- `profiles` — id (→ auth.users), email, display_name, role (`admin` | `editor` | `viewer`)
- `invites` — email, role, token, invited_by, status
- `folders` — id, name, parent_id (tree)
- `assets` — id, folder_id, filename, s3_key, thumb_s3_key, mime_type, size, width, height, content_hash (sha256), phash (perceptual), description (AI), embedding (pgvector), uploaded_by, created_at
- `tags` — id, name, kind (`manual` | `ai` | `color`)
- `asset_tags` — asset_id, tag_id

### Key flows
- **Upload**: dropzone → sha256 in browser → dup check API → presigned S3 PUT → server generates thumbnail (sharp) + perceptual hash → asset row created
- **AI tagging**: on demand/on upload → OpenAI Vision (gpt-4o-mini) returns tags + dominant colors + description → stored as tags; embedding (text-embedding-3-small) stored in pgvector
- **Search**: tag/color/type filters (SQL) + natural-language box (query embedding → pgvector cosine similarity), combinable
- **Previews**: images via thumbnails + presigned GET; video/audio via native `<video>`/`<audio>`; PDF via iframe; everything else → file-type icon
- **Duplicates**: exact via sha256 on upload (blocked/warned); near-dup images via perceptual hash flagged in UI
- **Team**: admin invites by email (Supabase invite), assigns role; middleware enforces admin/editor/viewer permissions on all routes

### Roles
- **admin** — everything: team management, delete anything
- **editor** — upload, tag, edit, move, delete own
- **viewer** — browse, search, download only

## Tasks

### Phase 0 — Foundation
- [x] Scaffold Next.js + TypeScript + Tailwind (dark theme, `border-radius: 0` design tokens)
- [x] Supabase client setup (browser + server), auth middleware, login page
- [x] Database schema SQL migration (incl. pgvector) + RLS policies
- [x] `.env.example` with all required vars documented

### Phase 1 — Core features (subagents in parallel tracks)
- [x] **Track A — Storage & upload**: presigned S3 upload API, dropzone UI, sha256 dup check, sharp thumbnail pipeline, perceptual hash
- [x] **Track B — AI & search**: OpenAI Vision auto-tag endpoint, embedding generation, NL search API (pgvector), tag/color/type filter API
- [x] **Track C — UI shell**: sidebar folder tree (create/rename/delete/move), asset grid, asset detail panel (preview, tag editor, metadata), search bar + filter UI
- [x] **Track D — Team**: invite flow, team page, role management, permission enforcement

### Phase 2 — Integration & polish
- [x] Wire all tracks together; production build passes with all 18 routes
- [x] Browser smoke test with headless Chrome (login renders, middleware redirect works; authed flows need real Supabase creds)
- [x] README with setup instructions (Supabase project, S3 bucket CORS, env vars)

## Review

**Built (2026-08-02).** Four parallel subagent tracks + foundation, integrated and verified:
- `npx tsc --noEmit` — clean; eslint — clean; `next build` — succeeds, 18 routes.
- Headless Chrome: `/` redirects signed-out users to `/login` (307), login page renders correctly (dark, sharp corners), zero console errors.

**One integration fix during Phase 2:** OpenAI client was constructed at module load, crashing `next build` when `OPENAI_API_KEY` is unset — replaced with a lazy Proxy singleton in `src/lib/openai.ts`.

**Known items / not yet done:**
- `.env.local` currently holds PLACEHOLDERS — user must fill real Supabase/AWS/OpenAI values (see README).
- `supabase/schema.sql` must be run in the Supabase SQL editor before first use.
- End-to-end authed flow (upload → auto-tag → search) untested until real credentials exist.
- Next.js 16 deprecation warning: `middleware.ts` → `proxy.ts` convention (works fine today; low-priority rename).
- Post-MVP backlog (from original brief): comments/annotations, moodboards, inboxes, audit trail, video tools, format conversion on download, archives, collection-level access, Resend @mentions, ratings/flags/labels, OCR text-in-image search.

---

# Feature 2 — Error tracking + cloud auto-fix loop

Locked decisions: DB log + GitHub Issues capture; fixes by cloud Claude Code (claude-code-action using subscription OAuth token, NOT an API key); triggered when an error issue is filed; private repo under Snoe0; PRs require manual review before merge/deploy.

### Part 1 — Error capture in the app
- [ ] `supabase/errors.sql` — `errors` table: fingerprint (unique), message, stack, source (client|server), context (url/route), count, first_seen, last_seen, status (open|issue_filed|resolved), github_issue_number; admin-only RLS
- [ ] POST `/api/errors` — capture endpoint; fingerprint = hash(message + top stack frame); dedupe by upsert (increment count, update last_seen)
- [ ] Client capture — small component in root layout listening to `window.onerror` + `unhandledrejection`, plus `global-error.tsx` boundary → POST /api/errors
- [ ] Server capture — `instrumentation.ts` with Next's `onRequestError` hook → log directly to DB
- [ ] Auto-file GitHub issue on new fingerprint (GitHub REST via `GITHUB_TOKEN` PAT env var, label `auto-error`, body = message/stack/route/count); save issue number
- [ ] Admin Errors page `/errors` — grouped list (message, count, first/last seen, source, status, GH issue link), Resolve button; admin-only
- [ ] Env additions: `GITHUB_TOKEN`, `GITHUB_REPO` in .env.example

### Part 2 — GitHub repo
- [ ] Create private repo under Snoe0, commit all code (no Claude attribution per global git rules), push main

### Part 3 — Cloud auto-fix workflow
- [ ] `.github/workflows/auto-fix-errors.yml` — on issue labeled `auto-error` → anthropics/claude-code-action with `CLAUDE_CODE_OAUTH_TOKEN` secret; prompt: diagnose from stack trace, fix root cause, open PR "Fixes #<issue>"; never auto-merge
- [ ] User actions (documented): install Claude GitHub App on the repo; run `claude setup-token` and I add it as repo secret; create fine-grained PAT for issue filing
- [ ] README section documenting the whole loop

### Review (Feature 2)
_(pending)_

---

# Feature 3 — UX batch (team view exit, drag-and-drop, multi-select, folder upload, 1px fix)

All implementation via subagents (one per track). Facts from codebase exploration baked into each item.

### Track 1 — Team view exit + hide search bar
- [ ] `TopBar.tsx`: use `usePathname()`; on `/team` hide SearchInput/UploadToggle/FilterRow and instead show a "← Back to library" link (`next/link` → `/`)
- [ ] `Sidebar.tsx`: make the VAULT wordmark a `Link` to `/`
- [ ] `Sidebar.tsx` + `FolderTree.tsx`: when on `/team`, nav/folder clicks must `router.push('/')` in addition to `setSelection(...)` (currently they only mutate state, leaving you stuck on /team)

### Track 2 — Drag assets into folders (incl. multi-drag)
- [ ] `AssetGrid.tsx`: make `AssetCard` draggable; `dataTransfer` carries the dragged asset id(s) (all selected ids when dragging a selected card)
- [ ] `FolderTree.tsx`: folder rows become drop targets (highlight on dragover); drop → `PATCH /api/assets/[id]` with `folder_id` for each id → `refreshAssets()`
- [ ] `Sidebar.tsx`: "Unfiled" is a drop target too (`folder_id: null`); "All assets" is not a location, so not a target
- [ ] Gate dragging on `canWrite(role)`

### Track 3 — Multi-select
- [ ] `LibraryProvider.tsx`: add `selectedIds: Set<string>` alongside `selectedAssetId`; plain click = single select (opens DetailPanel), cmd/ctrl-click = toggle, shift-click = range, Esc clears
- [ ] `AssetGrid.tsx`: selected visual state for all selected cards; selection count badge; DetailPanel only when exactly one selected
- [ ] Multi-drag wires into Track 2 (batch move)

### Track 4 — Upload a whole folder
- [ ] `UploadDropzone.tsx`: add "Upload folder" input (`webkitdirectory`) next to the file input
- [ ] Handle dropped directories via `dataTransfer.items` + `webkitGetAsEntry()` recursive traversal (currently dropping a folder yields nothing)
- [ ] Recreate folder structure: for each unique relative dir path, create folders via `POST /api/folders` (reuse existing ones by name+parent), upload each file with its mapped `folderId`
- [ ] Add a concurrency cap (~4) — current code hashes whole files in memory and uploads all in parallel, which will choke on large folders

### Track 5 — Askew 1px cross (screenshot)
- [ ] Root cause: sidebar wordmark row (`Sidebar.tsx:49`, `h-14 border-b`) puts its line at y 55–56; main area line is FilterRow's `border-t` (`FilterRow.tsx:79`) at y 56–57
- [ ] Fix: add `border-b border-border` to the TopBar `h-14` row and remove FilterRow's `border-t` — both lines land at y 55–56

### Verification
- [ ] `npx tsc --noEmit` + `next build` clean
- [ ] Headless Chrome (chrome-control) screenshot to confirm the cross is aligned

### Review (Feature 3)
_(pending)_

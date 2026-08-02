# Vault — S3 File Tagging

A pics.io-inspired digital asset manager for teams. Upload files to **your own S3 bucket**, tag them manually or automatically with **OpenAI Vision**, and find them with **natural-language search** ("red car at night"). Dark, sharp-cornered UI. Team roles with read/write permissions.

## Features (MVP)

- **Folders** — organize assets in a nested folder tree
- **Upload** — drag-and-drop multi-file upload straight to S3 (presigned URLs)
- **Previews** — images, video, audio, and PDF render in-browser; thumbnails auto-generated
- **Duplicate detection** — exact duplicates blocked via SHA-256 at upload time; perceptual hashes stored for images
- **Manual tagging** — tag editor on every asset
- **AI auto-tagging** — OpenAI Vision extracts subject tags, dominant colors, and a description on upload (or on demand)
- **Search** — natural-language semantic search (pgvector embeddings) combinable with tag, color, and file-type filters
- **Team** — invite members by email; roles: **admin** (everything + team), **editor** (upload/tag/edit), **viewer** (browse/search/download)

## Setup

### 1. Supabase (auth + database)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Grab your keys from **Project Settings → API**: the project URL, the `anon` key, and the `service_role` key.
4. (Recommended) **Authentication → Providers → Email**: disable "Confirm email" for frictionless local testing, or leave it on and confirm via the emails Supabase sends.

> The **first account that signs up becomes the admin**. Everyone after that is a viewer unless invited with a different role.

### 2. AWS S3 (file storage)

1. Create an S3 bucket (private, default settings are fine).
2. Create an IAM user with programmatic access and this policy scoped to the bucket:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
       "Resource": ["arn:aws:s3:::YOUR_BUCKET", "arn:aws:s3:::YOUR_BUCKET/*"]
     }]
   }
   ```
3. Add a CORS configuration to the bucket (**Permissions → CORS**) so the browser can upload directly:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedOrigins": ["http://localhost:3000"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

### 3. OpenAI

Create an API key at [platform.openai.com](https://platform.openai.com/api-keys). Used for Vision auto-tagging (`gpt-4o-mini`) and search embeddings (`text-embedding-3-small`) — both cheap.

### 4. Environment

```bash
cp .env.example .env.local
# fill in every value
```

### 5. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up (first account = admin), and start uploading.

## How search works

Every AI-tagged asset stores an embedding of its description + tags + filename. A natural-language query is embedded the same way and matched by cosine similarity (pgvector), merged with exact keyword hits on filenames/descriptions. Tag, color, and type filters apply on top and are usable with or without a query.

## Error tracking & cloud auto-fix

Uncaught errors (browser + server) are captured automatically, deduplicated by fingerprint, and logged to the `errors` table — visible to admins at **/errors**. Each new unique error is auto-filed as a GitHub issue labeled `auto-error`, which triggers a GitHub Actions workflow where **Claude Code runs in the cloud**, diagnoses the stack trace, fixes the root cause, and opens a PR referencing the issue. **PRs are never auto-merged** — your review is the gate before anything ships.

One-time setup:

1. Run [`supabase/errors.sql`](supabase/errors.sql) in the Supabase SQL editor.
2. Add to `.env.local`: `GITHUB_REPO=Snoe0/s3-file-tagging` and `GITHUB_TOKEN=` a fine-grained PAT with **Issues: read/write** on the repo (local-dev shortcut: `gh auth token`).
3. Install the [Claude GitHub App](https://github.com/apps/claude) on the repo (or run `/install-github-app` inside Claude Code).
4. Generate a subscription OAuth token with `claude setup-token`, then store it as a repo secret:
   `gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo Snoe0/s3-file-tagging` (paste the token when prompted).
5. In the repo: **Settings → Actions → General → Workflow permissions** — check **"Allow GitHub Actions to create and approve pull requests"**.

The loop: error thrown → logged + deduped → issue filed → workflow runs Claude Code → fix PR → you review & merge.

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Auth, Postgres, pgvector) · AWS S3 · OpenAI API · sharp

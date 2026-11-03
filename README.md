# Smart Handover

AI-powered developer handover platform. Give it a public GitHub repository (and optional project notes) and it produces a structured handover report: what is built, what is pending, which modules exist, what is risky, and where a new developer should start.

> **Status:** MVP. No login system. See [MVP limitations](#mvp-limitations).

---

## Table of contents

1. [The problem](#the-problem)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [How it works](#how-it-works)
6. [Getting started (local)](#getting-started-local)
7. [Environment variables](#environment-variables)
8. [npm scripts](#npm-scripts)
9. [API reference](#api-reference)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Security notes](#security-notes)
13. [MVP limitations](#mvp-limitations)
14. [Testing checklist](#testing-checklist)
15. [Roadmap](#roadmap)

---

## The problem

When a developer leaves a project, the next developer has to work out what is finished, what only looks finished, and what is missing. Commit messages describe intent, not working software. Smart Handover reads the repository and your notes, then writes a report that keeps **verified facts** and **AI inference** clearly separate.

## Features

- Submit a public GitHub repository URL, with optional documentation as pasted text or a `.txt`, `.md` or `.pdf` upload (max 5 MB).
- Fetches repository info, recent commits (up to 100), the full file tree, languages and the README through Octokit.
- Masks secrets and anonymizes commit authors before anything is sent to Gemini.
- Generates a structured report: completion estimate, summary, completed and pending tasks, module breakdown with evidence, risks with severity, recommendations, and testing, documentation and deployment status.
- **Verified from GitHub** (computed by the server from file names) is shown apart from **AI-inferred** (conclusions by the model), along with what the AI could not determine.
- Role filter: Frontend, Backend, Database, DevOps, or All. The filter changes the tasks shown, with an empty state when a role has none.
- Review workflow: edit the report, then approve it. Approval status and timestamp are stored in MongoDB.
- Saved reports open from a link and survive a page refresh.
- 24-hour cache so the same repository and documentation do not hit GitHub and Gemini again. A "fresh analysis" option skips it.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, JavaScript (ES6+), Tailwind CSS 3, Axios, React Router DOM, Lucide React |
| Backend | Node.js 18+, Express, ES Modules, Mongoose, Octokit (`@octokit/rest`), Multer, pdf-parse |
| Database | MongoDB (local or Atlas) |
| AI | Google Gemini via `@google/generative-ai` |
| Tooling | dotenv, cors, nodemon, Git |

## Project structure

```
smart-handover-mvp/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  # MongoDB connection
│   │   │   └── gemini.js              # Single, shared Gemini client
│   │   ├── controllers/
│   │   │   ├── repoController.js      # analyze + project lookup, caching, doc parsing
│   │   │   └── reportController.js    # get, approve, edit report
│   │   ├── models/
│   │   │   ├── Project.model.js
│   │   │   └── Report.model.js
│   │   ├── routes/
│   │   │   ├── repoRoutes.js          # includes Multer upload config
│   │   │   └── reportRoutes.js
│   │   ├── services/
│   │   │   ├── githubService.js       # Octokit calls, URL parsing, verified signals
│   │   │   ├── geminiService.js       # prompt, JSON validation, error mapping
│   │   │   └── anonymize.js           # secret masking, tree and commit sanitizing
│   │   ├── utils/
│   │   │   └── errorHandler.js        # AppError + central error middleware
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Header.jsx
    │   │   ├── RepoForm.jsx
    │   │   ├── ReportCard.jsx         # card, pill, task list, empty state
    │   │   ├── RoleFilter.jsx
    │   │   ├── CompletionRing.jsx
    │   │   └── EditReportModal.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   └── Dashboard.jsx
    │   ├── services/
    │   │   └── api.js                 # all HTTP calls live here
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

If your folders have different names (for example `server` and `client`), use those names in every `cd` command below.

## How it works

1. **Validate.** The backend parses the GitHub URL and the uploaded documentation. Bad URLs, wrong file types and oversized files are rejected.
2. **Cache check.** If the same repository with the same documentation was analyzed in the last 24 hours, that report is returned immediately (unless "fresh analysis" is requested).
3. **Fetch.** Octokit loads repository info, 100 recent commits, the recursive file tree, languages and the README. Private, missing and empty repositories and GitHub rate limits return clear errors.
4. **Sanitize.** `.env` and key files, dependency folders, lock files and assets are removed from the tree. Secrets in commits, README and documentation are masked. Commit authors become "Contributor 1", "Contributor 2" and so on.
5. **Verified signals.** The server computes facts from file names: tests present, CI present, Dockerfile present, README present and so on. These are labeled verified.
6. **Analyze.** Gemini receives the sanitized data inside delimited "untrusted" blocks with instructions to ignore anything in them that looks like a command. It must return JSON. The backend validates and normalizes it, retries once if the JSON is invalid, and caps the completion estimate at 95%.
7. **Save.** A `Project` (the sanitized repository snapshot) and a `Report` (the analysis, with `approvalStatus: "pending"`) are saved to MongoDB.
8. **Review.** The user opens `/dashboard/:reportId`, filters by role, edits the report if needed and approves it.

### Data models

**Project:** `repoKey`, `repoUrl`, `owner`, `name`, `defaultBranch`, `metadata`, sanitized `commits`, `fileTree`, `signals`, `documentation`, `docHash`, `expiresAt`, timestamps.

**Report:** `project` (reference), `completionPercentage`, `completionBasis`, `confidence`, `projectSummary`, `completedTasks`, `pendingTasks`, `moduleBreakdown`, `identifiedRisks`, `recommendations`, `testingStatus`, `documentationStatus`, `deploymentStatus`, `verifiedFacts`, `inferredObservations`, `uncertainties`, `roleBasedTasks`, `approvalStatus`, `approvedAt`, `isEdited`, timestamps.

## Getting started (local)

### Prerequisites

- Node.js 18 or newer (`node -v`)
- A MongoDB database: local MongoDB or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A [Gemini API key](https://aistudio.google.com/apikey)
- A [GitHub personal access token](https://github.com/settings/tokens) (recommended). A classic token with no scopes is enough for public repositories. Without it GitHub allows only 60 requests per hour.

### 1. Clone

```bash
git clone <your-repo-url>
cd smart-handover-mvp
```

### 2. Backend

```bash
cd backend
npm install
```

Create `.env` from the example and fill it in:

```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows CMD
copy .env.example .env
```

Start the API:

```bash
npm run dev
```

You should see `MongoDB connected` and `Smart Handover API listening on port 5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create `.env` from the example (`VITE_API_URL=http://localhost:5000/api`), then:

```bash
npm run dev
```

Open `http://localhost:5173`.

### 3. Try it

Paste a small public repository URL (for example one of your own), optionally add notes, and click **Analyze project**. Analysis usually takes under a minute.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string. |
| `GEMINI_KEY` | Yes | Google Gemini API key. |
| `GITHUB_TOKEN` | Recommended | GitHub token. Raises the API limit from 60 to 5000 requests per hour. |
| `PORT` | No | Defaults to `5000`. Hosting platforms set this for you. |
| `CLIENT_URL` | Yes | Allowed frontend origin for CORS, for example `http://localhost:5173`. Several origins can be separated by commas. No trailing slash. |
| `GEMINI_MODEL` | No | Overrides the model. Defaults to `gemini-2.5-flash`. |
| `NODE_ENV` | No | Set to `production` when deployed. Hides stack traces and internal error messages. |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend base URL including `/api`, for example `http://localhost:5000/api`. |

Never put Gemini or GitHub keys in the frontend. Never commit a real `.env` file.

## npm scripts

### Backend

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API with nodemon (auto-restart on file changes). |
| `npm start` | Starts the API with plain Node. Use this in production. |
| `npm run check` | Syntax-checks the server entry file. |

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server on port 5173. |
| `npm run build` | Creates the production build in `dist/`. |
| `npm run preview` | Serves the production build locally. |
| `npm run deploy` | Builds and deploys to Vercel with the Vercel CLI (needs a one-time `npx vercel login`). |

## API reference

Base URL: `http://localhost:5000/api`. Errors always look like `{ "success": false, "message": "..." }`.

### `GET /health`

Returns `{ "status": "ok", "database": "connected" }`.

### `POST /repo/analyze`

Analyzes a repository and creates a project and report. Accepts `multipart/form-data` or JSON.

| Field | Type | Description |
|---|---|---|
| `repoUrl` | string, required | Public GitHub URL, for example `https://github.com/owner/repo`. |
| `documentation` | string, optional | Pasted documentation text. |
| `documentationFile` | file, optional | `.txt`, `.md` or `.pdf`, up to 5 MB. |
| `force` | `"true"`, optional | Skip the 24-hour cache. |

Response `201` (new analysis) or `200` (served from cache):

```json
{
  "success": true,
  "cached": false,
  "projectId": "671f...",
  "reportId": "671f...",
  "report": { "completionPercentage": 55, "projectSummary": "...", "approvalStatus": "pending" }
}
```

Example:

```bash
curl -X POST http://localhost:5000/api/repo/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/owner/repo"}'
```

| Status | Meaning |
|---|---|
| 400 | Invalid URL, unsupported file type or bad input |
| 403 | Private repository (not supported) |
| 404 | Repository not found |
| 413 | File or request too large |
| 422 | Empty repository, unreadable PDF or no files to analyze |
| 429 | GitHub or Gemini rate limit |
| 502 / 503 | GitHub, Gemini or database failure |

### `GET /repo/:id`

Returns the project (sanitized commits, file tree, signals, metadata). Documentation text is not included.

### `GET /reports/:id`

Returns the report with its project populated.

### `PATCH /reports/:id/approve`

Approves a pending report and stores `approvedAt`. Returns `409` if already approved.

### `PATCH /reports/:id`

Edits a pending report. Allowed fields: `projectSummary`, `testingStatus`, `documentationStatus`, `deploymentStatus`, `completedTasks`, `pendingTasks`, `recommendations`, `roleBasedTasks` (keys `frontend`, `backend`, `database`, `devops`, `general`). Unknown fields return `400`. Approved reports return `409`.

## Deployment

Recommended free setup: **MongoDB Atlas** (database) + **Render** (backend) + **Vercel** (frontend). Deploy in this order, because each step needs a URL from the previous one.

### 1. Push the project to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Check that `.env` is not in the commit (`git status` should never list it).

### 2. MongoDB Atlas

1. Create a free cluster and a database user.
2. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`). Render's free tier has no fixed IP.
3. Copy the connection string and replace `<password>`. This is your `MONGO_URI`.

### 3. Backend on Render

1. In Render, choose **New, Web Service** and connect the GitHub repository.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add environment variables: `MONGO_URI`, `GEMINI_KEY`, `GITHUB_TOKEN`, `NODE_ENV=production`. Set `CLIENT_URL` after the frontend is deployed (step 5).
4. Deploy. Your API URL will look like `https://your-api.onrender.com`. Check `/api/health`.

Render redeploys automatically on every push to `main`, so there is no separate backend deploy command.

On the free tier the service sleeps after inactivity, so the first request can take around 30 to 60 seconds.

### 4. Frontend on Vercel

Single-page apps need a rewrite rule, otherwise refreshing `/dashboard/<id>` returns a 404. Add `frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Then deploy, either from the Vercel dashboard (import the repository, set **Root Directory** to `frontend`, framework **Vite**, build command `npm run build`, output directory `dist`) or from the terminal:

```bash
cd frontend
npx vercel login      # once
npm run deploy
```

Set the environment variable `VITE_API_URL=https://your-api.onrender.com/api` in Vercel and redeploy. Vite reads it at build time, so a change needs a new build.

### 5. Connect the two

Go back to Render and set `CLIENT_URL` to your Vercel URL, for example `https://your-app.vercel.app` (no trailing slash). Render restarts the service. Open the Vercel URL and run an analysis.

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| `ERR_MODULE_NOT_FOUND ... repoController.js` | A file is missing or misnamed. Check that `src/controllers/` contains exactly `repoController.js` and `reportController.js`. On Windows, make sure the extension is not hidden (`.js.txt`). |
| `Cannot find package 'express'` (or another package) | Run `npm install` inside the backend folder. |
| `MONGO_URI is not set` | `.env` is missing or is not in the backend folder. |
| `MongoServerSelectionError` | Wrong connection string, or Atlas Network Access does not allow your IP. |
| `Cannot reach the server` in the browser | Backend is not running, or `VITE_API_URL` is wrong. Restart `npm run dev` after editing `.env`. |
| CORS error in the browser console | `CLIENT_URL` must exactly match the frontend origin, with no trailing slash. |
| `GitHub API rate limit exceeded` | Set `GITHUB_TOKEN`. |
| `The AI service rejected the server credentials` | Check `GEMINI_KEY`. |
| Gemini model not found | Set `GEMINI_MODEL` to a model available for your key. |
| 404 on refresh in production | Add the `vercel.json` rewrite shown above. |
| Analysis takes long | Large repositories and Gemini can take up to a minute or more. The frontend waits up to 3 minutes. |

## Security notes

- Secrets are masked and sensitive files are excluded before data goes to Gemini. Regex masking is a best-effort safeguard, **not** complete secret protection, and it can mask harmless text too.
- Repository content is treated as untrusted. It is delimited in the prompt and the model is told to ignore instructions found inside it. This reduces prompt-injection risk but cannot remove it.
- Commit authors are replaced with generic labels and emails are masked.
- Private repositories are rejected even if your GitHub token could read them.
- Uploads are kept in memory only, limited to 5 MB and to `.txt`, `.md` and `.pdf`.
- In production, error responses never include stack traces or internal messages.
- `.env` files are git-ignored. If a key was ever committed, rotate it.

## MVP limitations

- **No authentication.** Anyone who can open the app can approve a report. In production, approval must be restricted to authorized administrators.
- Only the 100 most recent commits are analyzed, and very large file trees are truncated (2000 paths stored, 400 sent to the AI).
- The report is an estimate. File names and commit messages cannot prove that a feature works, and the completion value is capped at 95%.
- Scanned PDFs (images without text) are not supported.
- No rate limiting on the analyze endpoint, so each request can use GitHub and Gemini quota.
- `@google/generative-ai` is used as specified. Google is moving to a newer SDK (`@google/genai`), so plan a migration later.

## Testing checklist

- [ ] Analyze a public repository with and without documentation.
- [ ] Refresh the dashboard page and confirm the report still loads.
- [ ] Analyze the same repository again and confirm it returns quickly (cached). Tick "fresh analysis" and confirm a new report is created.
- [ ] Try an invalid URL, a non-existent repository, a private repository and an empty repository. Each should show a clear message.
- [ ] Upload a `.pdf`, a `.md` and a `.txt`. Upload an `.exe` and confirm it is rejected.
- [ ] Switch every role filter and confirm the task list changes. Confirm a role with no tasks shows the empty state.
- [ ] Edit a report, then approve it. In MongoDB confirm `approvalStatus: "approved"` and `approvedAt`.
- [ ] Try to edit an approved report and confirm it is rejected.
- [ ] Stop MongoDB or use a wrong `GEMINI_KEY` and confirm the frontend shows a useful error.

## Roadmap

- Authentication and admin-only approval
- Support for private repositories through GitHub OAuth
- Rate limiting and a request queue for analysis
- Export reports as PDF or Markdown
- Report history and comparison between analyses
- Migration to the `@google/genai` SDK
- Automated tests for services and API routes

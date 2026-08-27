# Copilot Instructions — Self-Service Repository Request System

## What This Repository Does

This repository implements a **self-service platform** for engineers to request new GitHub repositories. The core flow is:

1. Engineer opens a GitHub Issue using the **New Repository Request** form.
2. A `repo-request` label is applied to the issue (by a reviewer or automation).
3. The **GitHub Actions workflow** (`.github/workflows/create-repo.yml`) triggers, parses the issue body, creates the repository, pushes a scaffold, assigns team permissions, and closes the issue.

---

## Key Files and Directories

| Path | Purpose |
|------|---------|
| `.github/ISSUE_TEMPLATE/repo-request.yml` | The structured issue form engineers fill out |
| `.github/workflows/create-repo.yml` | The pipeline that processes requests |
| `templates/dotnet/` | Scaffold for .NET 8 applications |
| `templates/java/` | Scaffold for Java 17 + Maven applications |
| `templates/python/` | Scaffold for Python 3.11+ applications |
| `.github/memory/` | Working Memory System |

---

## Workflow Overview

The workflow triggers on `issues: types: [labeled]` when the label is `repo-request`.

Steps:
1. **Parse** — Extracts repo name, org, app type, permission groups, and description from the issue body using `actions/github-script`.
2. **Validate** — Checks required fields and format. Comments errors on the issue and exits if validation fails.
3. **Checkout** — Checks out this capstone repo to access scaffold templates.
4. **Create repo** — Uses `gh repo create` with `REPO_CREATION_TOKEN`.
5. **Push scaffold** — Copies the relevant `templates/<app_type>/` directory into the new repo, replacing `APP_NAME` placeholders, and pushes to `main`.
6. **Assign permissions** — Uses the GitHub API to assign each selected group's team to the repo.
7. **Comment + close** — Posts success or failure comment on the issue and closes it.

---

## Scaffold Templates

Each scaffold uses `APP_NAME` as a placeholder throughout. The workflow replaces `APP_NAME` with the actual repository name during the push step.

- **dotnet**: .NET 8 console app, xUnit tests, `global.json`.
- **java**: Java 17 Maven project, JUnit 5 tests.
- **python**: Python 3.11 with `src/` layout, pytest, `pyproject.toml`.

---

## Permissions and Secrets

- `REPO_CREATION_TOKEN` secret must be set in this repository. It needs `repo`, `admin:org`, and `read:org` scopes for the target organization.
- Teams (`devops`, `engineers`, `admins`, `qa`) must already exist in the target organization. Missing teams are skipped with a warning.

---

## Memory System

Before suggesting changes, read:
1. `.github/memory/patterns-discovered.md` — reusable patterns and lessons.
2. `.github/memory/session-notes.md` — historical session summaries.
3. `.github/memory/scratch/working-notes.md` — active in-progress notes (not committed).

Update memory files when completing work:
- Durable patterns → `patterns-discovered.md`
- Completed session summaries → `session-notes.md`
- Active investigation → `scratch/working-notes.md` (not committed)

---

## Development Principles

- Keep scaffold templates minimal and not framework-version-specific. Engineers add their own dependencies.
- Do not hard-code the target organization in the workflow — it is parsed from the issue form.
- The workflow must be idempotent where possible (e.g., graceful handling of existing repos).
- All user-facing messages (issue comments) should be clear, actionable, and reference the workflow run URL on failure.

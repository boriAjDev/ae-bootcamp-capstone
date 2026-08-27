# Patterns Discovered

Reusable patterns, decisions, and lessons for the Self-Service Repository Request system.

---

## Issue Form Parsing

**Pattern**: GitHub Issue forms (`.github/ISSUE_TEMPLATE/*.yml`) use a structured body with labeled sections. When parsed in GitHub Actions, each field appears in the issue body as:

```
### <Label>

<value>
```

The `create-repo.yml` workflow uses `actions/github-script` with a JavaScript `extract()` helper function that applies a regular expression (`### <Label>\s+([^#]+?)`) to capture each section value. Checkbox groups are parsed by matching `- [x]` lines within the Permission Groups section.

---

## Scaffold Templates

**Pattern**: Each application type has a scaffold under `templates/<type>/`. The workflow copies the entire scaffold directory into the newly created repository using the GitHub Contents API (via `gh` CLI). This means scaffold templates must be maintained when updating framework conventions.

### Dotnet
- Uses `src/<RepoName>.sln` + `src/<RepoName>/` project layout.
- `global.json` pins the SDK version.

### Java
- Uses Maven `pom.xml` with a standard `src/main/java` / `src/test/java` layout.

### Python
- Uses `src/` for application code, `tests/` for unit tests.
- `requirements.txt` and `requirements-dev.txt` separate runtime and dev deps.
- `pyproject.toml` with setuptools config.

---

## GitHub Actions — Issue-Triggered Workflow

**Pattern**: Use `on: issues: types: [labeled]` to trigger the pipeline only when the `repo-request` label is applied. This prevents re-runs on every comment. The `create-repo.yml` workflow:
1. Parses the issue body.
2. Validates required fields.
3. Creates the repository via `gh repo create`.
4. Pushes the scaffold template.
5. Adds repository teams/permissions.
6. Comments on the issue with the result.
7. Closes the issue.

---

## Team Permissions

**Pattern**: The permission groups map to GitHub team slugs:
| Group | Slug | Permission |
|-------|------|-----------|
| devops | devops | maintain |
| engineers | engineers | push |
| admins | admins | admin |
| qa | qa | pull |

Teams must already exist in the target organization. The workflow skips team assignment silently if the team does not exist.

---

## Secret Requirements

The workflow requires the following repository secrets:
- `REPO_CREATION_TOKEN` — A GitHub PAT (or GitHub App token) with `repo`, `admin:org`, `read:org` scopes in the target organization.

---

## Memory System

**Pattern**: Tailored from the `ae-bootcamp-session-5` memory system. Key differences:
- `session-notes.md` tracks repo-request feature sessions, not general app TDD cycles.
- `patterns-discovered.md` (this file) focuses on GitHub Actions, issue parsing, scaffolding, and Terraform patterns.
- The scratch file is still git-ignored for active-session working notes.

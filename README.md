# Self-Service Repository Request System

## Project Overview
This repository provides a **self-service platform** that allows engineers to request new repositories for their applications. Engineers submit a GitHub Issue using the structured form, an automated pipeline processes the request, creates the repository in the target organization, pushes the appropriate starter scaffold, and assigns team permissions — all without manual DevOps intervention.

## How It Works

1. **Engineer submits a request** via the GitHub Issue form (`New Repository Request`).
2. The issue is labeled `repo-request` (manually by a reviewer, or automatically via a ruleset).
3. A **GitHub Actions workflow** triggers on the label, parses the issue body, and:
   - Validates all required fields.
   - Creates the repository in the specified organization using the `gh` CLI.
   - Pushes the scaffold template for the chosen application type.
   - Assigns team permissions to the specified groups.
   - Comments the result (repo URL or error) on the issue.
   - Closes the issue.

## Issue Form Fields

| Field | Description | Options |
|-------|-------------|---------|
| Repository Name | Lowercase name for the new repo | free text |
| Organization | GitHub org to create the repo in | `BoriOrg`, `MCO-Test-Org`, `Slalom`, `n/a` |
| Application Type | The tech stack scaffold to use | `dotnet`, `java`, `python` |
| Permission Groups | Teams granted access | `devops`, `engineers`, `admins`, `qa` |
| Description | Brief purpose of the application | free text |

## Request Schema

Requests are validated by `scripts/validate-request.js` before anything is created. A request that
breaks any rule below is rejected with a comment on the issue, and no repository API call is made.

| Field | Rule |
|-------|------|
| Repository Name | Required. Lowercase letters, numbers and hyphens only; must start and end with a letter or number. 1-100 characters, so single-character names are allowed. |
| Organization | Required. Must be one of the four approved values. Matching ignores case and is normalized back to the approved spelling. Any other value, including a hand-edited issue body, is rejected. |
| Application Type | Required. One of `dotnet`, `java`, `python`. |
| Permission Groups | Must all be in the allow-list. Unknown groups are rejected rather than skipped. At least one is required when an organization is selected. |
| Description | Required and cannot be blank. Maximum 350 characters, the limit GitHub enforces on repository descriptions. |

### Choosing `n/a`

`n/a` creates the repository outside any organization, under the account that owns
`REPO_CREATION_TOKEN`. The workflow resolves that account at run time and reports it in the success
comment, so the actual owner is always visible on the issue. Because GitHub teams only exist inside
organizations, no team permissions are applied and permission groups are not required.

### If the repository already exists

The request is **rejected**. Before creating anything, the workflow checks whether the target already
exists and stops if it does. Nothing is created, pushed, or modified, and the issue receives a comment
naming the existing repository with the options for continuing.

Existing repositories are never reused, because pushing a scaffold into one could overwrite work that
is already there. To retry, edit the issue with a different repository name and re-apply the
`repo-request` label.

If the check cannot reach GitHub, or the token lacks access to answer the question, the run fails
rather than assuming the name is free.

## Retrying a Request

The workflow starts on the `labeled` event. Applying a label that is **already present does nothing**,
so to retry you must **remove the `repo-request` label and add it again**.

Every failure comment states which stages completed, so you can tell whether a retry is safe:

| Outcome | Was anything created? | How to retry |
|---------|----------------------|--------------|
| Validation errors | No | Fix the issue body, then remove and re-add the label |
| Name already taken | No | Change the repository name, then remove and re-add the label |
| Create repository failed | No | Remove and re-add the label |
| Scaffold or permissions failed | **Yes** | Follow the recovery steps below; re-labelling alone will be rejected |

## Recovering from a Partial Failure

Because an existing repository is rejected, a run that created the repository but failed afterwards
cannot be retried by re-labelling. An operator has to resolve it. Both paths below are safe to
choose from; pick whichever suits the state of the repository.

**Repository created, scaffold push failed.** The repository exists but is empty.

```bash
# Option A: discard and let the requester retry
gh repo delete <owner>/<name> --yes
# then remove and re-add the repo-request label on the issue

# Option B: push the scaffold by hand from a clone of this repository
bash scripts/render-template.sh <dotnet|java|python> <name> /tmp/<name>
cd /tmp/<name> && git init -b main && git add -A \
  && git commit -m "chore: initial scaffold" \
  && git remote add origin https://github.com/<owner>/<name>.git \
  && git push origin main
```

**Scaffold pushed, permission assignment failed.** The repository and its code are correct, so do
**not** delete it. Assign the missing teams directly:

```bash
gh api --method PUT \
  "/orgs/<org>/teams/<team>/repos/<org>/<name>" \
  -f permission=<admin|maintain|push|pull>
```

Team-to-permission mapping is in the table above. Once access is correct, close the issue manually.

The scaffold step refuses to push into a repository that already has commits, so re-running it can
never overwrite existing content.

## Scaffold Templates

| Type | Location | Includes |
|------|----------|---------|
| .NET | `templates/dotnet/` | Solution, project, `global.json`, `.gitignore`, `README.md` |
| Java | `templates/java/` | Maven `pom.xml`, `src/` layout, `README.md` |
| Python | `templates/python/` | `src/`, `tests/`, `pyproject.toml`, `requirements*.txt`, `README.md` |

## Setup

### Required Secret

Add this secret to the capstone repository:

| Secret | Description |
|--------|-------------|
| `REPO_CREATION_TOKEN` | GitHub PAT (classic) with `repo`, `admin:org`, `read:org` scopes in the target org |

### Credential Policy

The workflow uses a **classic** personal access token. A classic PAT cannot be restricted to specific
organizations: it carries the granted scopes across every organization the owning account can access.
That blast radius is accepted deliberately, with these compensating controls:

- The organization allow-list in `scripts/validate-request.js` runs **before** any repository API call,
  so an edited issue body cannot direct the token at an unapproved organization.
- `actions/github-script` steps never interpolate issue content into script bodies, so issue text
  cannot execute in the job that holds the token.
- The token lives only in the `REPO_CREATION_TOKEN` secret and is passed per step through `GH_TOKEN`.

Operational requirements:

| Item | Value |
|------|-------|
| Owner | _assign a named owner_ |
| Rotation | Rotate at least every 90 days, and immediately if a workflow run is compromised |
| On rotation | Update the `REPO_CREATION_TOKEN` secret; no workflow change is needed |
| Revocation | Revoke in the owning account's Developer settings; runs then fail at repository creation |

If the token is ever moved to a GitHub App or a fine-grained PAT, revisit the `n/a` provisioning
path: it resolves the owner with `gh api user`, which has no meaningful result for a GitHub App.

### Required Teams (in target org)

The following GitHub teams must exist in the target organization. They are not needed when `n/a` is
selected, because the repository is not owned by an organization.

| Group | Team Slug | Permission |
|-------|-----------|-----------|
| devops | `devops` | maintain |
| engineers | `engineers` | push |
| admins | `admins` | admin |
| qa | `qa` | pull |

## Tests

```bash
node --test tests/
```

The suite covers issue-body parsing and request validation using fixtures in `tests/fixtures/`. CI
additionally lints the workflows with actionlint and builds each scaffold template.

## Memory System

See [`.github/memory/README.md`](.github/memory/README.md) for documentation on the Working Memory System used to preserve context and patterns across development sessions.

## Workflow

See [`.github/workflows/create-repo.yml`](.github/workflows/create-repo.yml) for the full pipeline definition.

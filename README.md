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
| Organization | GitHub org to create the repo in | free text |
| Application Type | The tech stack scaffold to use | `dotnet`, `java`, `python` |
| Permission Groups | Teams granted access | `devops`, `engineers`, `admins`, `qa` |
| Description | Brief purpose of the application | free text |

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
| `REPO_CREATION_TOKEN` | GitHub PAT with `repo`, `admin:org`, `read:org` scopes in the target org |

### Required Teams (in target org)

The following GitHub teams must exist in the target organization:

| Group | Team Slug | Permission |
|-------|-----------|-----------|
| devops | `devops` | maintain |
| engineers | `engineers` | push |
| admins | `admins` | admin |
| qa | `qa` | pull |

## Memory System

See [`.github/memory/README.md`](.github/memory/README.md) for documentation on the Working Memory System used to preserve context and patterns across development sessions.

## Workflow

See [`.github/workflows/create-repo.yml`](.github/workflows/create-repo.yml) for the full pipeline definition.

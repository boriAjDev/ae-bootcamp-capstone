# Patterns Discovered

Reusable patterns, decisions, and lessons for the Self-Service Repository Request system.

---

## Issue Form Parsing

The `create-repo.yml` workflow parses the issue body with `actions/github-script`. The parsing logic lives in `scripts/parse-request.js` (`parseRequest(body)`), which the workflow `require`s after checkout, and which `tests/parse-request.test.js` exercises with fixtures in `tests/fixtures/`. Change the parser there, never inline in the workflow, so behavior stays tested.

The extraction regex is `### <Label>\s+([^#]+?)(?=\n###|$)`. Checkbox groups are parsed with `- \[x\] (\w+)`.

**Known parser defects** (fixtures pin the current behavior; Phase 1 will change them):
- A `#` anywhere in the description makes the whole field parse as empty, because `[^#]` cannot cross it. Nothing validates the description, so the repository is still created.
- `\w+` truncates hyphenated checkbox labels (`data-platform` becomes `data`), and unknown groups are accepted by the parser.
- Real GitHub payloads use CRLF; the regex tolerates it because `\s` matches `\r`.

---

## Scaffold Templates

**Pattern**: Each application type has a scaffold under `templates/<type>/`. `scripts/render-template.sh` is the single transformation used by both `create-repo.yml` and the CI scaffold checks, so verified output matches provisioned output. It copies the template, substitutes `APP_NAME` in file contents, renames any path containing `APP_NAME`, and fails if any placeholder survives.

**Renaming is not optional.** Substituting only file contents produced a broken .NET repository: the solution referenced `<name>\<name>.csproj` while the files on disk were still `APP_NAME\APP_NAME.csproj`. Any new placeholder must be handled in both content and path.

**Open naming decision (T4.1)**: repository names with hyphens still generate invalid C# identifiers, because `RootNamespace` and `namespace APP_NAME.Tests;` become `my-new-app`. Java and Python are unaffected, since their package directories (`com/example/appname`, `src/app_name`) are not derived from the repository name.

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

**Never name a workflow env var `GROUPS`.** `GROUPS` is a built-in bash array holding the current user's group IDs, and bash overwrites any inherited value, so `GROUPS: ${{ steps.parse.outputs.groups }}` arrived in the script as a number like `4096`. This silently broke two things: the "at least one Permission Group" check could never fire, and the assignment loop looked up a numeric group that matched no team, so it warned and skipped while the run still reported success. The variable is now `PERMISSION_GROUPS`. Verify with `GROUPS=a,b bash -c 'echo $GROUPS'`.

actionlint's shellcheck integration (SC2128) is what surfaced this, which is why the lint job must stay green rather than be downgraded to a warning.

---

**Never interpolate `${{ }}` into an `actions/github-script` body.** The script is assembled as JavaScript source, so any issue-supplied value lands inside a template literal and can execute. Pass values through the step's `env:` block and read `process.env` instead. The workflow previously did this with the parsed application type, inside a job holding a `repo`/`admin:org` token.

**Validation belongs in `scripts/validate-request.js`, not in shell.** It defines the request schema (approved organizations, app types, group allow-list and permission mapping, name pattern, and the 350-character description limit that matches GitHub's own) and is unit tested. `parseRequest` extracts fields, `validateRequest` decides whether provisioning may proceed and returns the normalized request.

## Secret Requirements

The workflow requires the following repository secrets:
- `REPO_CREATION_TOKEN` — A GitHub PAT (or GitHub App token) with `repo`, `admin:org`, `read:org` scopes in the target organization.

---

## Memory System

**Pattern**: Tailored from the `ae-bootcamp-session-5` memory system. Key differences:
- `session-notes.md` tracks repo-request feature sessions, not general app TDD cycles.
- `patterns-discovered.md` (this file) focuses on GitHub Actions, issue parsing, scaffolding, and Terraform patterns.
- The scratch file is still git-ignored for active-session working notes.

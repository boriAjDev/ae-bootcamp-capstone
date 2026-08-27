# Implementation Task Backlog

This backlog implements [risk-remediation-plan.md](risk-remediation-plan.md). Tasks are ordered by dependency and risk reduction. Checkboxes are intentionally left open until the implementation and verification are complete.

## 0. Baseline and test harness

- [ ] **T0.1 Add workflow linting.** Add action/workflow syntax validation to repository CI and pin or review third-party action versions.
  - Acceptance: malformed workflow YAML and invalid action syntax fail CI.
  - Status: implemented in `.github/workflows/ci.yml` (actionlint pinned to `1.7.7`, issue-form YAML parsed with PyYAML). Awaiting first CI run to confirm the repository passes lint.
- [x] **T0.2 Extract parser behavior into testable code or a fixture-driven script.** Preserve the current issue-form headings as explicit test inputs.
  - Acceptance: valid form output parses into the expected structured request.
  - Status: parser extracted to `scripts/parse-request.js` and consumed by `create-repo.yml`; `tests/parse-request.test.js` passes (14 tests, `node --test tests/`). A test asserts the issue form still contains every heading the parser depends on.
- [x] **T0.3 Add negative fixtures.** Cover missing fields, empty groups, unknown groups, uppercase values, hyphenated names, single-character names, `#` in descriptions, quotes, multiline descriptions, and unexpected headings.
  - Acceptance: each fixture has an expected parse or validation result.
  - Status: 11 fixtures in `tests/fixtures/`. Two fixtures pin known defects for Phase 1: `#` in a description silently empties the field (T1.7) and unknown/hyphenated groups are accepted and truncated (T1.4).
- [ ] **T0.4 Add scaffold verification jobs.** Build/test the .NET and Java templates and install/test the Python template using supported tool versions.
  - Acceptance: all three template checks run in CI without modifying the source templates.
  - Status: jobs added for all three templates; rendering verified locally via `scripts/render-template.sh`. Build/test execution is unverified locally (no .NET SDK, JDK, or Python 3.11 available) and awaits the first CI run.

## 1. Request validation and authorization

- [ ] **T1.0 Replace free-text organization input with a controlled dropdown.** Update the repository request issue form so the organization field offers exactly `BoriOrg`, `MCO-Test-Org`, `Slalom`, and `None`.
  - Acceptance: requesters cannot enter an arbitrary organization value, the rendered field remains parseable by the workflow, and the selected value is normalized consistently.
- [ ] **T1.0a Define and implement the `None` provisioning path.** When `None` is selected, do not associate the new repository with an organization or assign organization teams. Resolve and document the personal owner/account under which GitHub will create the repository, since a repository must still have an owner.
  - Acceptance: a `None` request creates the repository under the approved non-organization owner, makes no organization repository API call, skips team assignment, and reports the actual owner and skipped permissions in the issue comment.
- [ ] **T1.0b Test organization selection branches.** Add fixtures and workflow tests for each approved organization and for `None`, including assertions that `None` cannot fall through to an organization URL or team-assignment loop.
  - Acceptance: all four dropdown values have an expected target-owner and permission behavior, and an invalid or manually injected value is rejected before repository creation.
- [ ] **T1.1 Define a request schema.** Specify allowed characters, length limits, required fields, normalized casing, and maximum description length.
  - Acceptance: the schema is documented and used by validation tests.
- [ ] **T1.2 Fix repository-name edge cases.** Permit or explicitly reject one-character names, and test the intended rule for leading/trailing hyphens.
  - Acceptance: validation behavior is deliberate and covered by fixtures.
- [ ] **T1.3 Validate the description.** Reject missing or whitespace-only descriptions and enforce a documented size limit.
  - Acceptance: repository creation is never attempted for an invalid description.
- [ ] **T1.4 Validate groups against an allow-list.** Reject unknown groups instead of silently skipping them; normalize checkbox values once.
  - Acceptance: every accepted group has a permission mapping.
- [ ] **T1.5 Restrict target organizations.** Implement an explicit organization allow-list or an equivalent approval lookup before repository creation.
  - Acceptance: an unapproved organization receives a clear issue comment and no repository API call occurs.
- [ ] **T1.6 Review credential permissions.** Replace the broad PAT where practical with a GitHub App or fine-grained credential limited to approved organizations and required operations.
  - Acceptance: the credential policy is documented, tested in a non-production organization, and has an owner and rotation procedure.
- [ ] **T1.7 Make parsing safe.** Replace fragile section matching with a parser that handles user text containing `#`, quotes, and multiline content without changing field boundaries.
  - Acceptance: special-character fixtures parse correctly and cannot alter workflow commands.

## 2. Idempotency, concurrency, and recovery

- [ ] **T2.1 Decide the existing-repository policy.** Choose reuse, reject, or explicit repair behavior and document it for requesters and operators.
  - Acceptance: the policy covers empty repositories, repositories with a scaffold, and repositories with unrelated content.
- [ ] **T2.2 Add concurrency protection.** Serialize runs by request identity and target organization/repository name.
  - Acceptance: simultaneous labels cannot provision the same target twice.
- [ ] **T2.3 Separate create, scaffold, and permissions status.** Persist or report which stages completed so partial runs are diagnosable.
  - Acceptance: a failure identifies the completed stage and the safe next action.
- [ ] **T2.4 Make scaffold push retryable.** Avoid destructive copying and ensure a retry cannot overwrite unrelated repository content.
  - Acceptance: a retry against a partially initialized repository follows the chosen policy.
- [ ] **T2.5 Define label and retry behavior.** Decide whether invalid issues are edited and relabeled, reopened, or handled by a separate retry label/event.
  - Acceptance: the failure comment tells the requester exactly how to retry.
- [ ] **T2.6 Add cleanup or repair guidance.** Document what happens when repository creation succeeds but scaffold push or permissions fail.
  - Acceptance: operators have a runbook for each partial-failure state.

## 3. Permission correctness

- [ ] **T3.1 Validate team existence before repository creation or define explicit deferred assignment behavior.**
  - Acceptance: missing teams cannot be mistaken for completed access provisioning.
- [ ] **T3.2 Treat permission assignment failures as meaningful.** Collect assignment results and fail or mark the request partial when any requested team is not assigned.
  - Acceptance: success is impossible when a required permission is missing.
- [ ] **T3.3 Verify effective permissions.** Query repository collaborators/team access after assignment and compare with the requested mapping.
  - Acceptance: each requested team has the expected permission before the success comment.
- [ ] **T3.4 Document least-privilege team mapping.** Review whether `admin`, `maintain`, `push`, and `pull` are appropriate for each group.
  - Acceptance: the mapping has an owner and security review sign-off.

## 4. Scaffold naming and generated-repository quality

- [ ] **T4.1 Choose package naming policy.** Decide how hyphenated repository names map to Java packages and Python importable modules.
  - Acceptance: the policy is documented with examples such as `my-new-app`.
- [ ] **T4.2 Implement deterministic placeholder transformation.** Replace only intended placeholders and rename files/directories where required by the selected naming policy.
  - Acceptance: no unintended `APP_NAME` tokens remain and generated identifiers are valid for each language.
- [ ] **T4.3 Make generated README commands accurate.** Verify paths and commands after placeholder substitution for all three templates.
  - Acceptance: documented build, test, and run commands work in generated repositories.
- [ ] **T4.4 Add generated-output smoke tests.** Generate repositories from representative names and run build/test commands.
  - Acceptance: names with hyphens and the shortest valid name are covered.

## 5. Observability and requester experience

- [ ] **T5.1 Standardize issue comments.** Include request status, failed stage, workflow run URL, and an actionable next step in every failure path.
  - Acceptance: validation, authorization, provisioning, and partial-permission failures each have a distinct message.
- [ ] **T5.2 Add structured workflow summaries.** Publish parsed request metadata without exposing secrets and summarize stage results.
  - Acceptance: an operator can diagnose a run from the workflow summary and logs.
- [ ] **T5.3 Add audit metadata.** Record the issue number, requester, approved organization, target repository, and workflow run identifier.
  - Acceptance: an operator can trace a repository to its originating request.
- [ ] **T5.4 Document operational prerequisites.** Update README with credential setup, organization allow-list ownership, team requirements, retry behavior, and partial-failure recovery.
  - Acceptance: a new operator can perform a dry run using the documentation.

## Suggested delivery slices

1. T0.1-T0.4: establish checks and capture behavior.
2. T1.0-T1.0b: implement and verify controlled organization selection, including `None`.
3. T1.1-T1.7: prevent unsafe or ambiguous requests.
4. T2.1-T2.6: make retries and partial failures predictable.
5. T3.1-T3.4: make permissions part of the success contract.
6. T4.1-T4.4: verify generated repository quality.
7. T5.1-T5.4: finish operator documentation and auditability.

## Verification record

Record implementation PRs, test runs, policy decisions, and dry-run results here as the backlog is completed. Do not mark a task complete based only on a successful workflow syntax check; behavior must be verified at the narrowest level that exercises the task.

### Phase 0 (in progress)

- `node --test tests/` passes with 14 tests on Node 20, covering 11 issue-body fixtures, CRLF handling, empty bodies, and issue-form heading drift.
- `scripts/render-template.sh` renders all three templates with no `APP_NAME` tokens remaining, verified locally.
- Blocking defects found and fixed while building the scaffold checks:
  - The scaffold step substituted `APP_NAME` in file contents but never renamed files or directories, so every generated .NET repository contained a solution referencing project paths that did not exist. Rendering now renames paths, and `create-repo.yml` uses the same script as CI.
  - `templates/python/pyproject.toml` declared `build-backend = "setuptools.backends.legacy:build"`, which does not exist (`ModuleNotFoundError: No module named 'setuptools.backends'`). Corrected to `setuptools.build_meta`.
  - `templates/dotnet/.../SampleTests.cs` was missing `using Xunit;`, so `[Fact]` and `Assert` could not compile.
  - `templates/dotnet/src/APP_NAME.sln` had no `ProjectConfigurationPlatforms` section, so no project was selected for build.
- Open Phase 0 items: first CI run must confirm actionlint passes (T0.1) and that the three scaffolds build, test, and install (T0.4).
- The first CI run failed the lint job, which caught a latent production bug: the workflow passed permission groups through an env var named `GROUPS`, which bash overwrites with its built-in group-ID array. Team assignment therefore never matched a real team and the empty-group validation could never fire, yet runs still reported success. Renamed to `PERMISSION_GROUPS`, plus quoting and redirect-grouping fixes. Verified locally with actionlint 1.7.7 and shellcheck 0.10.0: 0 errors across both workflows.
- Deferred by design: hyphenated repository names still produce invalid C# identifiers (`namespace my-new-app.Tests`). CI uses `sampleapp` until the T4.1 naming policy is decided; T4.4 adds hyphen and shortest-name coverage.

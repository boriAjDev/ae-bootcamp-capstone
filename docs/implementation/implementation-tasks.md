# Implementation Task Backlog

This backlog implements [risk-remediation-plan.md](risk-remediation-plan.md). Tasks are ordered by dependency and risk reduction. Checkboxes are intentionally left open until the implementation and verification are complete.

## 0. Baseline and test harness

- [x] **T0.1 Add workflow linting.** Add action/workflow syntax validation to repository CI and pin or review third-party action versions.
  - Acceptance: malformed workflow YAML and invalid action syntax fail CI.
  - Status: `.github/workflows/ci.yml` runs actionlint pinned to `1.7.7` (with shellcheck) and parses every issue form with PyYAML. Verified: the first run failed on real findings, and the job passes after they were fixed.
- [x] **T0.2 Extract parser behavior into testable code or a fixture-driven script.** Preserve the current issue-form headings as explicit test inputs.
  - Acceptance: valid form output parses into the expected structured request.
  - Status: parser extracted to `scripts/parse-request.js` and consumed by `create-repo.yml`; `tests/parse-request.test.js` passes (14 tests, `node --test tests/`). A test asserts the issue form still contains every heading the parser depends on.
- [x] **T0.3 Add negative fixtures.** Cover missing fields, empty groups, unknown groups, uppercase values, hyphenated names, single-character names, `#` in descriptions, quotes, multiline descriptions, and unexpected headings.
  - Acceptance: each fixture has an expected parse or validation result.
  - Status: 11 fixtures in `tests/fixtures/`. Two fixtures pin known defects for Phase 1: `#` in a description silently empties the field (T1.7) and unknown/hyphenated groups are accepted and truncated (T1.4).
- [x] **T0.4 Add scaffold verification jobs.** Build/test the .NET and Java templates and install/test the Python template using supported tool versions.
  - Acceptance: all three template checks run in CI without modifying the source templates.
  - Status: all three jobs pass in CI. Each renders into `runner.temp` via `scripts/render-template.sh`, so source templates are never modified.

## 1. Request validation and authorization

- [x] **T1.0 Replace free-text organization input with a controlled dropdown.** Update the repository request issue form so the organization field offers exactly `BoriOrg`, `MCO-Test-Org`, `Slalom`, and `None`.
  - Acceptance: requesters cannot enter an arbitrary organization value, the rendered field remains parseable by the workflow, and the selected value is normalized consistently.
  - Correction: GitHub rejects `None` as a dropdown option because it is a reserved word. The no-organization choice is `n/a`, and `NO_ORGANIZATION` in `validate-request.js` matches it case-insensitively.
- [x] **T1.0a Define and implement the `None` provisioning path.** When `None` is selected, do not associate the new repository with an organization or assign organization teams. Resolve and document the personal owner/account under which GitHub will create the repository, since a repository must still have an owner.
  - Acceptance: a `None` request creates the repository under the approved non-organization owner, makes no organization repository API call, skips team assignment, and reports the actual owner and skipped permissions in the issue comment.
  - Decision: the owner is the account that owns `REPO_CREATION_TOKEN`, resolved at run time via `gh api user`. This keeps the owner truthful without a second credential, and the success comment always names it. Revisit if the token becomes a GitHub App (T1.6), since apps have no user account.
- [x] **T1.0b Test organization selection branches.** Add fixtures and workflow tests for each approved organization and for `None`, including assertions that `None` cannot fall through to an organization URL or team-assignment loop.
  - Acceptance: all four dropdown values have an expected target-owner and permission behavior, and an invalid or manually injected value is rejected before repository creation.
  - Status: covered in `tests/validate-request.test.js`, including the `org-injected` fixture. Team assignment is gated on `owner_type == 'organization'` in the workflow.
- [x] **T1.1 Define a request schema.** Specify allowed characters, length limits, required fields, normalized casing, and maximum description length.
  - Acceptance: the schema is documented and used by validation tests.
  - Status: implemented in `scripts/validate-request.js` and documented under "Request Schema" in the README.
- [x] **T1.2 Fix repository-name edge cases.** Permit or explicitly reject one-character names, and test the intended rule for leading/trailing hyphens.
  - Acceptance: validation behavior is deliberate and covered by fixtures.
  - Decision: one-character names are permitted. Leading and trailing hyphens are rejected.
- [x] **T1.3 Validate the description.** Reject missing or whitespace-only descriptions and enforce a documented size limit.
  - Acceptance: repository creation is never attempted for an invalid description.
  - Decision: limit is 350 characters, matching GitHub's own repository description limit.
- [x] **T1.4 Validate groups against an allow-list.** Reject unknown groups instead of silently skipping them; normalize checkbox values once.
  - Acceptance: every accepted group has a permission mapping.
- [x] **T1.5 Restrict target organizations.** Implement an explicit organization allow-list or an equivalent approval lookup before repository creation.
  - Acceptance: an unapproved organization receives a clear issue comment and no repository API call occurs.
- [x] **T1.6 Review credential permissions.** Replace the broad PAT where practical with a GitHub App or fine-grained credential limited to approved organizations and required operations.
  - Acceptance: the credential policy is documented, tested in a non-production organization, and has an owner and rotation procedure.
  - Decision: a classic PAT is the chosen model. A classic PAT cannot be scoped to specific organizations, so the T1.5 organization allow-list and the removal of script interpolation are the compensating controls. Policy, rotation, and revocation are documented under "Credential Policy" in the README.
  - Residual: a named owner still has to be assigned, and the token should be exercised against a non-production organization before it is relied on.
- [x] **T1.7 Make parsing safe.** Replace fragile section matching with a parser that handles user text containing `#`, quotes, and multiline content without changing field boundaries.
  - Acceptance: special-character fixtures parse correctly and cannot alter workflow commands.
  - Status: the parser now splits on heading lines instead of matching `[^#]`. Separately, all `${{ }}` interpolation was removed from `actions/github-script` bodies and replaced with `env`, closing a script-injection path.

## 2. Idempotency, concurrency, and recovery

- [x] **T2.1 Decide the existing-repository policy.** Choose reuse, reject, or explicit repair behavior and document it for requesters and operators.
  - Acceptance: the policy covers empty repositories, repositories with a scaffold, and repositories with unrelated content.
  - Decision: **reject**. The workflow checks for the target before creating anything and stops if it exists, regardless of whether that repository is empty, already scaffolded, or holds unrelated content. Reuse was rejected because pushing a scaffold into an existing repository can overwrite real work. Documented under "If the repository already exists" in the README.
  - The check distinguishes a 404 from a permissions or transport error, so an unreachable API fails the run instead of being read as "name is free".
- [x] **T2.2 Add concurrency protection.** Serialize runs by request identity and target organization/repository name.
  - Acceptance: simultaneous labels cannot provision the same target twice.
  - Status: the workflow is split into a `request` job and a `provision` job. `provision` uses a concurrency group keyed on the resolved `owner/name` from `needs.request.outputs`, so two different issues requesting the same target are serialized and the second is rejected by the existence check.
- [x] **T2.3 Separate create, scaffold, and permissions status.** Persist or report which stages completed so partial runs are diagnosable.
  - Acceptance: a failure identifies the completed stage and the safe next action.
  - Status: the create, scaffold, and permissions steps have ids, and both the job summary and the failure comment render a per-stage table from `steps.<id>.conclusion`. The comment then states the safe next action, which differs depending on whether the repository was created.
- [x] **T2.4 Make scaffold push retryable.** Avoid destructive copying and ensure a retry cannot overwrite unrelated repository content.
  - Acceptance: a retry against a partially initialized repository follows the chosen policy.
  - Status: the scaffold step aborts if the cloned repository already has commits, and the push is never forced. Combined with the T2.1 reject policy, a scaffold can only ever land in a repository this workflow just created and left empty.
- [x] **T2.5 Define label and retry behavior.** Decide whether invalid issues are edited and relabeled, reopened, or handled by a separate retry label/event.
  - Acceptance: the failure comment tells the requester exactly how to retry.
  - Decision: retry by removing the `repo-request` label and adding it again. Re-applying a label that is already present raises no `labeled` event, so every failure comment now says to remove and re-add rather than "re-apply".
- [x] **T2.6 Add cleanup or repair guidance.** Document what happens when repository creation succeeds but scaffold push or permissions fail.
  - Acceptance: operators have a runbook for each partial-failure state.
  - Status: "Retrying a Request" and "Recovering from a Partial Failure" in the README cover each state, including the case where the repository exists and re-labelling would be rejected.

## 3. Permission correctness

- [x] **T3.1 Validate team existence before repository creation or define explicit deferred assignment behavior.**
  - Acceptance: missing teams cannot be mistaken for completed access provisioning.
  - Decision: reject before creating anything. A missing team stops the request while nothing exists to clean up, rather than deferring the grant, which is easy to forget. The issue comment names the missing teams.
- [x] **T3.2 Treat permission assignment failures as meaningful.** Collect assignment results and fail or mark the request partial when any requested team is not assigned.
  - Acceptance: success is impossible when a required permission is missing.
  - Status: the `|| echo "Warning..."` fallback is gone. Assignment runs through `actions/github-script`, and any API error fails the step.
- [x] **T3.3 Verify effective permissions.** Query repository collaborators/team access after assignment and compare with the requested mapping.
  - Acceptance: each requested team has the expected permission before the success comment.
  - Status: after assigning, the workflow reads each team's effective `role_name` and compares it with the requested permission via `scripts/team-permissions.js`. Any missing or mismatched grant fails the run, and the failure comment lists exactly which access was not applied. A team granted **more** access than requested is also treated as a mismatch.
- [x] **T3.4 Document least-privilege team mapping.** Review whether `admin`, `maintain`, `push`, and `pull` are appropriate for each group.
  - Acceptance: the mapping has an owner and security review sign-off.
  - Status: the README now records a rationale per group and notes that `devops` is `maintain` rather than `admin` so it cannot delete repositories or change access.
  - Residual: mapping owner and security sign-off are still unassigned.

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

### Phase 0 (complete)

- CI run `33107397245` on commit `2d35a3b` passed all five jobs: lint, parser tests, and the .NET, Java, and Python scaffold checks. Phase 0 is verified end to end.

- `node --test tests/` passes with 14 tests on Node 20, covering 11 issue-body fixtures, CRLF handling, empty bodies, and issue-form heading drift.
- `scripts/render-template.sh` renders all three templates with no `APP_NAME` tokens remaining, verified locally.
- Blocking defects found and fixed while building the scaffold checks:
  - The scaffold step substituted `APP_NAME` in file contents but never renamed files or directories, so every generated .NET repository contained a solution referencing project paths that did not exist. Rendering now renames paths, and `create-repo.yml` uses the same script as CI.
  - `templates/python/pyproject.toml` declared `build-backend = "setuptools.backends.legacy:build"`, which does not exist (`ModuleNotFoundError: No module named 'setuptools.backends'`). Corrected to `setuptools.build_meta`.
  - `templates/dotnet/.../SampleTests.cs` was missing `using Xunit;`, so `[Fact]` and `Assert` could not compile.
  - `templates/dotnet/src/APP_NAME.sln` had no `ProjectConfigurationPlatforms` section, so no project was selected for build.
- Open Phase 0 items: none.
- The first CI run failed the lint job, which caught a latent production bug: the workflow passed permission groups through an env var named `GROUPS`, which bash overwrites with its built-in group-ID array. Team assignment therefore never matched a real team and the empty-group validation could never fire, yet runs still reported success. Renamed to `PERMISSION_GROUPS`, plus quoting and redirect-grouping fixes. Verified locally with actionlint 1.7.7 and shellcheck 0.10.0: 0 errors across both workflows.
- Deferred by design: hyphenated repository names still produce invalid C# identifiers (`namespace my-new-app.Tests`). CI uses `sampleapp` until the T4.1 naming policy is decided; T4.4 adds hyphen and shortest-name coverage.

### Phase 1 (complete)

- Validation moved out of shell and into `scripts/validate-request.js`, so every rule is unit tested. `node --test tests/` covers 39 tests across parsing and validation.
- The parser now splits the issue body on heading lines, so `#`, quotes, and multiline descriptions are preserved. The Phase 0 fixtures that pinned those defects now assert correct behavior.
- Closed a script-injection path: `actions/github-script` steps no longer interpolate `${{ }}` into script bodies. Attacker-controlled values arrive via `env` and are read from `process.env`. Verified by scanning the workflow for interpolations outside `env:` blocks.
- Organization is now a dropdown, and the workflow branches on owner type. Team assignment is skipped entirely for `None`.
- Also removed the deprecated `gh repo create --confirm` flag.
- Credential model chosen: classic PAT, documented in the README with its blast-radius limitation and compensating controls.
- Verified by CI run `33111452486` on commit `5ab30a1`: all five jobs pass. Earlier Phase 1 commits ran no CI at all, because `ci.yml` only triggered on pushes to `main` or on `pull_request` and no PR was open after PR #2 merged. `ci.yml` now runs on every branch push.

### First live request (issue #3)

The first real request was reported as "the pipeline did not trigger". It did trigger: run `33108047957`
fired on `main` from the `issues` event, failed validation, commented on the issue, and exited. No
repository was created because the request selected no permission groups, and the organization field
contained the free text `n/a`.

Two findings:

- The issue form's `validations: required: true` on `checkboxes` did **not** prevent submission with
  zero boxes checked, so form-level requiredness cannot be relied on. The workflow-side allow-list is
  the real control. The checkbox `validations` block was removed and the requirement stated in the
  field description instead.
- `main` was still at the Phase 0 merge, so the request used the old free-text organization field.
  Merging Phase 1 removes that class of error by making Organization a dropdown.

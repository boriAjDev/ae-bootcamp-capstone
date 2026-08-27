# Self-Service Repository Request Risk Remediation Plan

## Purpose

This plan turns the static review of the self-service repository request system into an implementation sequence. The goal is to make repository provisioning predictable, secure, recoverable, and testable while preserving the repository's intentionally minimal scaffold templates.

## Scope

In scope:

- Request parsing and validation
- Organization authorization and token governance
- Repository creation and rerun behavior
- Scaffold copying and placeholder transformation
- Team permission assignment
- Issue status, retry, and failure handling
- Automated validation of the workflow and generated scaffolds
- Documentation and operational observability

Out of scope for the first remediation cycle:

- Building a web application or API
- Adding application-specific framework dependencies to templates
- Replacing GitHub Issues with an external request portal
- Introducing Terraform or another infrastructure state system

## Desired end state

A valid request has one predictable outcome: exactly one approved target repository is created or reused, the requested scaffold is pushed once, all requested permissions are verified, and the issue receives an accurate success or actionable failure status. Invalid or unauthorized requests are rejected before repository creation. Every behavior is covered by a focused test or an explicit integration check.

## Priority and sequencing

### Phase 0: Establish a safety baseline

Before changing behavior, add workflow linting, fixture-based parser tests, and a documented test harness. Capture current behavior so later changes can be evaluated without relying on live organization resources.

### Phase 1: Validate and authorize requests

Define strict schemas for repository name, organization, application type, groups, and description. Restrict target organizations to an explicit allow-list or an equivalent authorization mechanism. Reject malformed, unknown, or unauthorized values before creating anything.

### Phase 2: Make provisioning recoverable and idempotent

Choose and document the existing-repository policy. Use stable lookup and creation behavior so retries do not create duplicate repositories or overwrite unexpected content. Add explicit status handling for partially completed runs.

### Phase 3: Make permissions and completion truthful

Treat team assignment as part of the success contract. Verify every requested team and permission after assignment, and fail or clearly report partial completion instead of silently continuing.

### Phase 4: Harden scaffold generation

Make placeholder replacement deterministic. Decide whether repository names should influence language package/module names, especially for hyphenated names, and verify each generated scaffold by building and running its tests.

### Phase 5: Improve operator and requester experience

Make retry instructions actionable, include run links in all failure paths, add concurrency protection, and document required secrets, teams, organization policy, and recovery procedures.

## Risk register and outcomes

| ID | Risk | Target outcome | Priority |
|---|---|---|---|
| R1 | Issue-body parser depends on rendered headings and rejects `#` content | Versioned, fixture-tested parsing contract that handles normal user text safely | High |
| R2 | Required fields and organizations are incompletely validated | Invalid or unauthorized requests fail before repository creation | Critical |
| R3 | Powerful token plus free-form organization input creates excessive blast radius | Requests are limited to approved organizations and least-privilege credentials | Critical |
| R4 | Repeated labels or reruns are not fully idempotent | Reruns have a documented, deterministic existing-repository policy | High |
| R5 | Team assignment errors are swallowed | Workflow success means requested permissions were verified | High |
| R6 | Invalid requests are difficult to retry | Requesters receive a clear correction and retry path | Medium |
| R7 | Placeholder replacement leaves fixed Java/Python package names | Generated projects follow a documented naming policy and pass build/test checks | Medium |
| R8 | No workflow-level or integration validation exists | Parser, validation, shell behavior, and scaffold outputs are continuously checked | High |
| R9 | Partial failures can leave a repository without a truthful issue state | Recovery and compensation behavior is explicit and observable | High |

## Acceptance criteria

- A test fixture exists for a valid request and for malformed, missing, duplicate, and special-character values.
- An unauthorized organization cannot reach `gh repo create`.
- A repeated request produces a documented result without silently overwriting repository content.
- A missing team or incorrect permission cannot produce a false success comment.
- Generated .NET, Java, and Python scaffolds build or install and run their tests in automation.
- Every failure comment contains the workflow run URL and a next action.
- Workflow concurrency prevents two runs from provisioning the same request simultaneously.
- Required secret, team, organization, and recovery requirements are documented for operators.

## Dependencies and decisions to resolve

1. Which organizations are approved targets, and who owns that allow-list?
2. Should an existing repository be reused, rejected, or treated as a partially completed request?
3. Should a missing requested team fail the workflow or create a warning state requiring human approval?
4. Which credential model is available: fine-grained PAT, GitHub App, or organization-owned automation identity?
5. Should Java package names and Python import names be derived from the repository name, or remain stable template names?
6. Can workflow tests run locally with shell fixtures, or is a dedicated GitHub Actions integration environment required?

## Definition of done

The backlog in [implementation-tasks.md](implementation-tasks.md) is completed for the selected policy decisions, focused tests pass, generated scaffolds are verified, documentation matches the workflow, and a dry run has been reviewed by an operator with access to the target organization.

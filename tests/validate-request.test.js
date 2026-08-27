'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { parseRequest } = require('../scripts/parse-request');
const {
  ORGANIZATIONS,
  NO_ORGANIZATION,
  MAX_DESCRIPTION_LENGTH,
  MAX_REPO_NAME_LENGTH,
  validateRequest,
} = require('../scripts/validate-request');

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

function validateFixture(name) {
  const body = fs.readFileSync(path.join(FIXTURE_DIR, `${name}.md`), 'utf8').replace(/\r\n/g, '\n');
  return validateRequest(parseRequest(body));
}

function request(overrides = {}) {
  return {
    repoName: 'my-new-app',
    repoOrg: 'BoriOrg',
    appType: 'python',
    groups: ['devops'],
    description: 'A valid description.',
    ...overrides,
  };
}

function errorText(result) {
  return result.errors.join(' | ');
}

test('accepts a valid organization request', () => {
  const result = validateFixture('valid-request');

  assert.strictEqual(result.valid, true, errorText(result));
  assert.deepStrictEqual(result.request, {
    repoName: 'my-new-app',
    ownerType: 'organization',
    organization: 'BoriOrg',
    appType: 'dotnet',
    groups: ['devops', 'admins'],
    description: 'Service that stores customer preferences.',
    permissions: [
      { group: 'devops', permission: 'maintain' },
      { group: 'admins', permission: 'admin' },
    ],
  });
});

// T1.0b: every dropdown value must have a defined target owner.
for (const organization of ORGANIZATIONS) {
  test(`accepts approved organization: ${organization}`, () => {
    const result = validateRequest(request({ repoOrg: organization }));

    assert.strictEqual(result.valid, true, errorText(result));
    assert.strictEqual(result.request.ownerType, 'organization');
    assert.strictEqual(result.request.organization, organization);
  });
}

test('normalizes organization casing to the approved spelling', () => {
  const result = validateRequest(request({ repoOrg: 'mco-test-org' }));

  assert.strictEqual(result.valid, true, errorText(result));
  assert.strictEqual(result.request.organization, 'MCO-Test-Org');
});

test(`${NO_ORGANIZATION} resolves to a user owner and assigns no teams`, () => {
  const result = validateFixture('org-none');

  assert.strictEqual(result.valid, true, errorText(result));
  assert.strictEqual(result.request.ownerType, 'user');
  assert.strictEqual(result.request.organization, null);
  assert.deepStrictEqual(result.request.permissions, []);
});

test(`${NO_ORGANIZATION} does not require permission groups`, () => {
  const result = validateRequest(request({ repoOrg: 'n/a', groups: [] }));

  assert.strictEqual(result.valid, true, errorText(result));
});

test('rejects an organization that the dropdown never offered', () => {
  const result = validateFixture('org-injected');

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.request, null);
  assert.match(errorText(result), /Organization must be one of/);
  assert.match(errorText(result), /AttackerOrg/);
});

test('rejects a missing organization', () => {
  const result = validateRequest(request({ repoOrg: '' }));

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /Organization is required/);
});

// T1.2: single-character names are deliberately permitted.
test('accepts a single-character repository name', () => {
  const result = validateFixture('single-character-name');

  assert.strictEqual(result.valid, true, errorText(result));
  assert.strictEqual(result.request.repoName, 'a');
});

test('rejects uppercase and otherwise malformed repository names', () => {
  for (const repoName of ['My-New-App', '-leading', 'trailing-', 'has space', 'under_score', 'ünicode']) {
    const result = validateRequest(request({ repoName }));
    assert.strictEqual(result.valid, false, `expected '${repoName}' to be rejected`);
    assert.match(errorText(result), /Repository Name must be lowercase/);
  }
});

test('rejects a missing repository name', () => {
  const result = validateFixture('missing-repo-name');

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /Repository Name is required/);
});

test('rejects a repository name over the length limit', () => {
  const result = validateRequest(request({ repoName: 'a'.repeat(MAX_REPO_NAME_LENGTH + 1) }));

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /characters or fewer/);
});

// T1.3
test('rejects a missing description', () => {
  const result = validateFixture('missing-description');

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /Repository Description is required/);
});

test('rejects a whitespace-only description', () => {
  const result = validateRequest(request({ description: '   \n\t  ' }));

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /Repository Description is required/);
});

test('rejects a description over the length limit', () => {
  const result = validateRequest(request({ description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) }));

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /350 characters or fewer/);
});

test('accepts a description containing "#", quotes, and multiple lines', () => {
  assert.strictEqual(validateFixture('hash-in-description').valid, true);
  assert.strictEqual(validateFixture('quotes-in-description').valid, true);
  assert.strictEqual(validateFixture('multiline-description').valid, true);
});

// T1.4
test('rejects unknown permission groups instead of skipping them', () => {
  const result = validateFixture('unknown-groups');

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.request, null);
  assert.match(errorText(result), /Unknown Permission Group\(s\): security, data-platform/);
});

test('rejects an organization request with no permission groups', () => {
  const result = validateFixture('empty-groups');

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /At least one Permission Group must be selected/);
});

test('deduplicates repeated groups and maps every group to a permission', () => {
  const result = validateRequest(request({ groups: ['devops', 'devops', 'qa'] }));

  assert.strictEqual(result.valid, true, errorText(result));
  assert.deepStrictEqual(result.request.groups, ['devops', 'qa']);
  assert.deepStrictEqual(result.request.permissions, [
    { group: 'devops', permission: 'maintain' },
    { group: 'qa', permission: 'pull' },
  ]);
});

test('rejects an unsupported application type', () => {
  const result = validateRequest(request({ appType: 'rust' }));

  assert.strictEqual(result.valid, false);
  assert.match(errorText(result), /Application Type must be one of/);
});

test('reports every problem at once so a requester can fix them in one edit', () => {
  const result = validateRequest({
    repoName: 'Bad Name',
    repoOrg: 'AttackerOrg',
    appType: 'rust',
    groups: ['nope'],
    description: '',
  });

  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.errors.length, 5);
});

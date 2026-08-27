'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  expectedRoleName,
  evaluateAssignments,
  describeFailures,
} = require('../scripts/team-permissions');
const { GROUP_PERMISSIONS } = require('../scripts/validate-request');

test('every group in the permission mapping has a role name', () => {
  for (const permission of Object.values(GROUP_PERMISSIONS)) {
    assert.ok(expectedRoleName(permission), `no role name for '${permission}'`);
  }
});

test('throws rather than guessing when a permission has no role name', () => {
  assert.throws(() => expectedRoleName('sudo'), /No role name is defined/);
});

test('verifies assignments that match the requested permission', () => {
  const requested = [
    { group: 'devops', permission: 'maintain' },
    { group: 'qa', permission: 'pull' },
  ];
  const evaluation = evaluateAssignments(requested, { devops: 'maintain', qa: 'read' });

  assert.strictEqual(evaluation.ok, true);
  assert.deepStrictEqual(
    evaluation.results.map((result) => result.status),
    ['verified', 'verified'],
  );
});

test('a team with no access fails verification', () => {
  const requested = [{ group: 'admins', permission: 'admin' }];
  const evaluation = evaluateAssignments(requested, {});

  assert.strictEqual(evaluation.ok, false);
  assert.strictEqual(evaluation.results[0].status, 'missing');
  assert.deepStrictEqual(describeFailures(evaluation.results), [
    "admins: expected 'admin' but the team has no access",
  ]);
});

// Broader access than requested is still a mismatch, so over-permissioning cannot pass silently.
test('a team with the wrong permission fails verification', () => {
  const requested = [{ group: 'engineers', permission: 'push' }];
  const evaluation = evaluateAssignments(requested, { engineers: 'admin' });

  assert.strictEqual(evaluation.ok, false);
  assert.strictEqual(evaluation.results[0].status, 'mismatch');
  assert.deepStrictEqual(describeFailures(evaluation.results), [
    "engineers: expected 'write' but found 'admin'",
  ]);
});

test('one bad assignment fails the whole request', () => {
  const requested = [
    { group: 'devops', permission: 'maintain' },
    { group: 'engineers', permission: 'push' },
  ];
  const evaluation = evaluateAssignments(requested, { devops: 'maintain', engineers: null });

  assert.strictEqual(evaluation.ok, false);
  assert.strictEqual(describeFailures(evaluation.results).length, 1);
});

test('an empty request is trivially satisfied', () => {
  assert.deepStrictEqual(evaluateAssignments([], {}), { ok: true, results: [] });
});

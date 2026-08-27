'use strict';

// Comparison logic for team permission assignment, kept free of API calls so the
// success contract can be unit tested.

// GitHub reports effective access as a role name, which does not match the
// permission value used when assigning it.
const ROLE_NAMES = {
  pull: 'read',
  triage: 'triage',
  push: 'write',
  maintain: 'maintain',
  admin: 'admin',
};

function expectedRoleName(permission) {
  const role = ROLE_NAMES[permission];
  if (!role) {
    throw new Error(`No role name is defined for permission '${permission}'`);
  }
  return role;
}

// `observed` maps a team slug to the role name GitHub reports, or null when the
// team has no access to the repository.
function evaluateAssignments(requested, observed) {
  const results = requested.map(({ group, permission }) => {
    const expected = expectedRoleName(permission);
    const actual = observed[group] ?? null;

    let status;
    if (actual === null) {
      status = 'missing';
    } else if (actual === expected) {
      status = 'verified';
    } else {
      status = 'mismatch';
    }

    return { group, permission, expected, actual, status };
  });

  return {
    ok: results.every((result) => result.status === 'verified'),
    results,
  };
}

function describeFailures(results) {
  return results
    .filter((result) => result.status !== 'verified')
    .map((result) =>
      result.status === 'missing'
        ? `${result.group}: expected '${result.expected}' but the team has no access`
        : `${result.group}: expected '${result.expected}' but found '${result.actual}'`,
    );
}

module.exports = { ROLE_NAMES, expectedRoleName, evaluateAssignments, describeFailures };

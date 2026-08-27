'use strict';

// Request schema. Shared by .github/workflows/create-repo.yml and its tests so a
// request is rejected before any repository API call when it does not conform.

const ORGANIZATIONS = ['BoriOrg', 'MCO-Test-Org', 'Slalom'];
const NO_ORGANIZATION = 'None';
const APP_TYPES = ['dotnet', 'java', 'python'];

const GROUP_PERMISSIONS = {
  devops: 'maintain',
  engineers: 'push',
  admins: 'admin',
  qa: 'pull',
};

const REPO_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const MAX_REPO_NAME_LENGTH = 100;
// GitHub rejects repository descriptions longer than this.
const MAX_DESCRIPTION_LENGTH = 350;

function validateRepoName(name, errors) {
  if (!name) {
    errors.push('Repository Name is required.');
    return '';
  }
  if (name.length > MAX_REPO_NAME_LENGTH) {
    errors.push(`Repository Name must be ${MAX_REPO_NAME_LENGTH} characters or fewer.`);
    return '';
  }
  if (!REPO_NAME_PATTERN.test(name)) {
    errors.push(
      'Repository Name must be lowercase letters, numbers, and hyphens, and must start and end with a letter or number.',
    );
    return '';
  }
  return name;
}

function validateOwner(rawOrg, errors) {
  if (!rawOrg) {
    errors.push('Organization is required.');
    return null;
  }

  const candidate = rawOrg.trim();
  const approved = [...ORGANIZATIONS, NO_ORGANIZATION].find(
    (org) => org.toLowerCase() === candidate.toLowerCase(),
  );

  if (!approved) {
    errors.push(
      `Organization must be one of: ${[...ORGANIZATIONS, NO_ORGANIZATION].join(', ')}. Got: '${candidate}'.`,
    );
    return null;
  }

  if (approved === NO_ORGANIZATION) {
    return { type: 'user', organization: null };
  }

  return { type: 'organization', organization: approved };
}

function validateAppType(appType, errors) {
  if (!appType) {
    errors.push('Application Type is required.');
    return '';
  }
  if (!APP_TYPES.includes(appType)) {
    errors.push(`Application Type must be one of: ${APP_TYPES.join(', ')}. Got: '${appType}'.`);
    return '';
  }
  return appType;
}

function validateGroups(groups, owner, errors) {
  const unique = [...new Set(groups)];
  const unknown = unique.filter((group) => !Object.hasOwn(GROUP_PERMISSIONS, group));

  if (unknown.length > 0) {
    errors.push(
      `Unknown Permission Group(s): ${unknown.join(', ')}. Allowed groups: ${Object.keys(GROUP_PERMISSIONS).join(', ')}.`,
    );
    return [];
  }

  // Team permissions only exist inside an organization.
  if (owner && owner.type === 'user') {
    return unique;
  }

  if (unique.length === 0) {
    errors.push('At least one Permission Group must be selected.');
  }

  return unique;
}

function validateDescription(description, errors) {
  const trimmed = (description || '').trim();

  if (!trimmed) {
    errors.push('Repository Description is required and cannot be blank.');
    return '';
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Repository Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer. Got ${trimmed.length}.`,
    );
    return '';
  }
  return trimmed;
}

function validateRequest(parsed) {
  const errors = [];

  const repoName = validateRepoName(parsed.repoName, errors);
  const owner = validateOwner(parsed.repoOrg, errors);
  const appType = validateAppType(parsed.appType, errors);
  const groups = validateGroups(parsed.groups || [], owner, errors);
  const description = validateDescription(parsed.description, errors);

  if (errors.length > 0) {
    return { valid: false, errors, request: null };
  }

  return {
    valid: true,
    errors: [],
    request: {
      repoName,
      ownerType: owner.type,
      organization: owner.organization,
      appType,
      groups,
      description,
      permissions: groups.map((group) => ({ group, permission: GROUP_PERMISSIONS[group] })),
    },
  };
}

module.exports = {
  ORGANIZATIONS,
  NO_ORGANIZATION,
  APP_TYPES,
  GROUP_PERMISSIONS,
  MAX_REPO_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  validateRequest,
};

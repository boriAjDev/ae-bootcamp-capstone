'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { parseRequest, FIELD_LABELS } = require('../scripts/parse-request');

const FIXTURE_DIR = path.join(__dirname, 'fixtures');

// GitHub delivers issue bodies with CRLF; fixtures are normalized so expectations stay readable.
function loadFixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIR, `${name}.md`), 'utf8').replace(/\r\n/g, '\n');
}

const cases = [
  {
    name: 'valid-request',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'dotnet',
      groups: ['devops', 'admins'],
      description: 'Service that stores customer preferences.',
    },
  },
  {
    name: 'missing-repo-name',
    expected: {
      repoName: '',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['devops'],
      description: 'The repository name section was removed from the issue body.',
    },
  },
  {
    name: 'missing-description',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['devops'],
      description: '',
    },
  },
  {
    name: 'empty-groups',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'java',
      groups: [],
      description: 'No groups were selected for this request.',
    },
  },
  {
    name: 'uppercase-values',
    expected: {
      repoName: 'My-New-App',
      repoOrg: 'BoriOrg',
      appType: 'dotnet',
      groups: ['devops', 'qa'],
      description: 'Mixed case values submitted through an edited issue body.',
    },
  },
  {
    name: 'single-character-name',
    expected: {
      repoName: 'a',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['engineers'],
      description: 'Shortest possible repository name.',
    },
  },
  {
    name: 'quotes-in-description',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'java',
      groups: ['engineers'],
      description: "Parses \"quoted\" values, 'single quoted' values and `code` spans.",
    },
  },
  {
    name: 'multiline-description',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'dotnet',
      groups: ['devops'],
      description: [
        'First paragraph describing the service.',
        '',
        'Second paragraph with details:',
        '',
        '- ingests events',
        '- publishes metrics',
      ].join('\n'),
    },
  },
  {
    name: 'unexpected-heading',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['qa'],
      description: 'Description followed by an unexpected section.',
    },
  },
  {
    name: 'hash-in-description',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['engineers'],
      description: 'Tracks work for issue #42 and the #platform channel.',
    },
  },
  {
    name: 'unknown-groups',
    expected: {
      repoName: 'my-new-app',
      repoOrg: 'BoriOrg',
      appType: 'python',
      groups: ['devops', 'security', 'data-platform'],
      description: 'Requests groups that are not in the permission mapping.',
    },
  },
];

for (const { name, expected } of cases) {
  test(`parses fixture: ${name}`, () => {
    assert.deepStrictEqual(parseRequest(loadFixture(name)), expected);
  });
}

test('parses an empty or missing body without throwing', () => {
  assert.deepStrictEqual(parseRequest(''), {
    repoName: '',
    repoOrg: '',
    appType: '',
    groups: [],
    description: '',
  });
  assert.deepStrictEqual(parseRequest(undefined), parseRequest(''));
});

test('parses CRLF bodies identically to LF bodies', () => {
  const lf = loadFixture('valid-request');
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.deepStrictEqual(parseRequest(crlf), parseRequest(lf));
});

test('issue form still uses the headings the parser depends on', () => {
  const form = fs.readFileSync(
    path.join(__dirname, '..', '.github', 'ISSUE_TEMPLATE', 'repo-request.yml'),
    'utf8',
  );

  for (const label of Object.values(FIELD_LABELS)) {
    assert.ok(
      form.includes(`label: "${label}"`) || form.includes(`label: ${label}`),
      `issue form is missing the "${label}" field label required by the parser`,
    );
  }
});

// Regression cover for the defects that fixture-driven testing exposed in Phase 0.
test('keeps a description containing "#" intact', () => {
  const parsed = parseRequest(loadFixture('hash-in-description'));

  assert.strictEqual(parsed.description, 'Tracks work for issue #42 and the #platform channel.');
});

test('keeps hyphenated checkbox labels intact', () => {
  const parsed = parseRequest(loadFixture('unknown-groups'));

  assert.deepStrictEqual(parsed.groups, ['devops', 'security', 'data-platform']);
});

test('treats the GitHub "_No response_" placeholder as empty', () => {
  const body = ['### Repository Name', '', '_No response_', ''].join('\n');

  assert.strictEqual(parseRequest(body).repoName, '');
});

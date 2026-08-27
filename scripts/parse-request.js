'use strict';

// Shared by .github/workflows/create-repo.yml and the parser test suite so that
// workflow parsing behavior can be verified without a live GitHub event.

const FIELD_LABELS = {
  repoName: 'Repository Name',
  repoOrg: 'Organization',
  appType: 'Application Type',
  groups: 'Permission Groups',
  description: 'Repository Description',
};

function extractSection(body, label) {
  const re = new RegExp(`### ${label}\\s+([^#]+?)(?=\\n###|$)`, 's');
  const match = String(body).match(re);
  return match ? match[1].trim() : '';
}

function extractGroups(body) {
  const section = extractSection(body, FIELD_LABELS.groups);
  return (section.match(/- \[x\] (\w+)/gi) || [])
    .map((line) => line.replace(/- \[x\] /i, '').trim().toLowerCase());
}

function parseRequest(body) {
  const text = body || '';

  return {
    repoName: extractSection(text, FIELD_LABELS.repoName),
    repoOrg: extractSection(text, FIELD_LABELS.repoOrg),
    appType: extractSection(text, FIELD_LABELS.appType).toLowerCase(),
    groups: extractGroups(text),
    description: extractSection(text, FIELD_LABELS.description),
  };
}

module.exports = { FIELD_LABELS, extractSection, extractGroups, parseRequest };

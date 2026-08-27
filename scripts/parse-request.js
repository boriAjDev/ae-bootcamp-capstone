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

// GitHub renders an unanswered field with this literal placeholder.
const NO_RESPONSE = '_No response_';

const HEADING = /^###\s+(.+?)\s*$/;
const CHECKBOX = /^\s*-\s+\[([ xX])\]\s*(.*)$/;

// Splitting on heading lines keeps field values intact when they contain "#",
// quotes, or blank lines, which a single whole-body regex cannot do.
function parseSections(body) {
  const sections = new Map();
  const lines = String(body).replace(/\r\n/g, '\n').split('\n');

  let label = null;
  let buffer = [];

  const flush = () => {
    if (label !== null && !sections.has(label)) {
      sections.set(label, buffer.join('\n').trim());
    }
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      label = heading[1];
      buffer = [];
    } else if (label !== null) {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

function sectionValue(sections, label) {
  const value = sections.get(label);
  if (value === undefined || value === NO_RESPONSE) {
    return '';
  }
  return value;
}

function checkedGroups(sections) {
  const section = sectionValue(sections, FIELD_LABELS.groups);
  if (!section) {
    return [];
  }

  const groups = [];
  for (const line of section.split('\n')) {
    const match = CHECKBOX.exec(line);
    if (match && match[1].toLowerCase() === 'x') {
      const label = match[2].trim().toLowerCase();
      if (label) {
        groups.push(label);
      }
    }
  }
  return groups;
}

function parseRequest(body) {
  const sections = parseSections(body || '');

  return {
    repoName: sectionValue(sections, FIELD_LABELS.repoName),
    repoOrg: sectionValue(sections, FIELD_LABELS.repoOrg),
    appType: sectionValue(sections, FIELD_LABELS.appType).toLowerCase(),
    groups: checkedGroups(sections),
    description: sectionValue(sections, FIELD_LABELS.description),
  };
}

module.exports = { FIELD_LABELS, NO_RESPONSE, parseSections, parseRequest };

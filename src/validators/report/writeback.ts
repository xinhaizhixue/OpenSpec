import type { SpecCoverageEntry } from './spec-coverage.js';
import type { ValidationScenarioResult } from '../types.js';

/**
 * Render validation results into validation.md content.
 */
export function renderValidationReport(
  results: ValidationScenarioResult[],
  coverage: SpecCoverageEntry[] = []
): string {
  const lines: string[] = [
    '# Validation Report',
    '',
    '| REQ-ID | Scenario | Status | Evidence | Failure Reason |',
    '|---|---|---|---|---|',
  ];

  if (results.length === 0) {
    lines.push('| _none_ | _none_ | SKIPPED | _none_ | No scenarios were discovered. |');
  } else {
    for (const result of results) {
      const evidence = result.evidence.length > 0
        ? result.evidence.map((item) => `[${item.label}](${escapePipe(item.path)})`).join('<br>')
        : '—';
      lines.push(
        `| ${escapePipe(result.requirementId)} | ${escapePipe(result.scenarioTitle)} | ${result.status} | ${evidence} | ${escapePipe(result.reason ?? '—')} |`
      );
    }
  }

  if (coverage.length > 0) {
    lines.push('', '## Spec Coverage', '', '| REQ-ID | Referenced In |', '|---|---|');
    for (const entry of coverage) {
      lines.push(`| ${escapePipe(entry.requirementId)} | ${entry.references.map(escapePipe).join('<br>')} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Returns true when every rendered scenario row is PASS.
 */
export function validationReportIsAllGreen(markdown: string): boolean {
  const rows = markdown
    .split('\n')
    .filter((line) => /^\|\s*[A-Z0-9-]+\s*\|/.test(line));

  if (rows.length === 0) {
    return false;
  }

  return rows.every((row) => /\|\s*PASS\s*\|/.test(row));
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, '\\|');
}

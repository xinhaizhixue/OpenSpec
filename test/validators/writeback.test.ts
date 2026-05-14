import { describe, expect, it } from 'vitest';
import {
  renderValidationReport,
  validationReportIsAllGreen,
} from '../../src/validators/report/writeback.js';

describe('validation writeback', () => {
  it('renders scenario results and coverage into validation markdown', () => {
    const markdown = renderValidationReport(
      [
        {
          requirementId: 'REQ-TODO-001',
          requirementTitle: 'Add todo items',
          scenarioTitle: 'Add a todo item',
          status: 'PASS',
          evidence: [{ label: 'Screenshot', path: '.openspec-validation/playwright/add.png' }],
          validator: 'playwright',
        },
      ],
      [
        {
          requirementId: 'REQ-TODO-001',
          references: ['src/app.ts'],
        },
      ]
    );

    expect(markdown).toContain('| REQ-TODO-001 | Add a todo item | PASS |');
    expect(markdown).toContain('## Spec Coverage');
    expect(markdown).toContain('src/app.ts');
  });

  it('detects non-green validation tables', () => {
    expect(
      validationReportIsAllGreen(
        `# Validation Report

| REQ-ID | Scenario | Status | Evidence | Failure Reason |
|---|---|---|---|---|
| REQ-TODO-001 | Add a todo item | SKIPPED | — | no key |
| REQ-TODO-001 | Add a todo item | PASS | — | — |
`
      )
    ).toBe(true);

    expect(
      validationReportIsAllGreen(
        `# Validation Report

| REQ-ID | Scenario | Status | Evidence | Failure Reason |
|---|---|---|---|---|
| REQ-TODO-001 | Add a todo item | FAIL | — | boom |
`
      )
    ).toBe(false);
  });
});

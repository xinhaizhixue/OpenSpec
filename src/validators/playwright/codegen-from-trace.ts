import path from 'path';
import { promises as fs } from 'fs';
import type { ValidationConfig, ValidationScenario, ValidationScenarioResult } from '../types.js';

/**
 * Generate a deterministic Playwright spec from passing validation scenarios.
 */
export async function generatePlaywrightSpec(
  changeDir: string,
  scenarios: ValidationScenario[],
  config: ValidationConfig,
  existingResults: ValidationScenarioResult[] = []
): Promise<string> {
  const passingIds = new Set(
    existingResults
      .filter((result) => result.validator === 'playwright' && result.status === 'PASS')
      .map((result) => `${result.requirementId}:${result.scenarioTitle}`)
  );

  const selectedScenarios = passingIds.size > 0
    ? scenarios.filter((scenario) => passingIds.has(`${scenario.requirementId}:${scenario.scenarioTitle}`))
    : scenarios;

  const outputDir = path.join(changeDir, 'playwright');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'validation.generated.spec.ts');

  const lines: string[] = [
    "import { test, expect } from '@playwright/test';",
    '',
    `const baseUrl = process.env.OPENSPEC_BASE_URL ?? '${config.baseUrl}';`,
    '',
    "function todoItem(page: import('@playwright/test').Page, title: string) {",
    "  return page.locator('[data-testid=\"todo-item\"]').filter({ has: page.getByText(title, { exact: true }) }).first();",
    '}',
    '',
  ];

  for (const scenario of selectedScenarios) {
    lines.push(`test('${scenario.requirementId} ${escapeText(scenario.scenarioTitle)}', async ({ page }) => {`);
    for (const step of scenario.steps) {
      if (step.action === 'goto') {
        lines.push(`  await page.goto(new URL('${step.path ?? '/'}', baseUrl).toString(), { waitUntil: 'domcontentloaded' });`);
      } else if (step.action === 'fill-new-todo') {
        lines.push(`  await page.getByTestId('new-todo-input').fill('${escapeText(step.todoTitle ?? '')}');`);
      } else if (step.action === 'click-add-todo') {
        lines.push("  await page.getByTestId('add-todo-button').click();");
      } else if (step.action === 'toggle-todo') {
        lines.push(`  await todoItem(page, '${escapeText(step.todoTitle ?? '')}').getByRole('checkbox').click();`);
      } else if (step.action === 'delete-todo') {
        lines.push(`  await todoItem(page, '${escapeText(step.todoTitle ?? '')}').getByRole('button', { name: /delete/i }).click();`);
      } else if (step.action === 'assert-visible') {
        lines.push(`  await expect(todoItem(page, '${escapeText(step.todoTitle ?? '')}')).toBeVisible();`);
      } else if (step.action === 'assert-completed') {
        lines.push(`  await expect(todoItem(page, '${escapeText(step.todoTitle ?? '')}')).toHaveAttribute('data-completed', 'true');`);
      } else if (step.action === 'assert-absent') {
        lines.push(`  await expect(todoItem(page, '${escapeText(step.todoTitle ?? '')}')).toHaveCount(0);`);
      }
    }
    lines.push('});', '');
  }

  await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  return outputPath;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

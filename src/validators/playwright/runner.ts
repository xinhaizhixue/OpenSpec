import path from 'path';
import { promises as fs } from 'fs';
import type { ValidationConfig, ValidationScenario, ValidationScenarioResult } from '../types.js';

/**
 * Execute compiled scenarios with Playwright when the optional dependency is available.
 */
export async function runPlaywrightValidation(
  changeDir: string,
  scenarios: ValidationScenario[],
  config: ValidationConfig
): Promise<ValidationScenarioResult[]> {
  let playwrightModule: any;

  try {
    playwrightModule = await import('@playwright/test');
  } catch {
    return scenarios.map((scenario) => ({
      requirementId: scenario.requirementId,
      requirementTitle: scenario.requirementTitle,
      scenarioTitle: scenario.scenarioTitle,
      status: 'SKIPPED',
      evidence: [],
      reason: 'Playwright skipped: install optional dependency @playwright/test to run browser validation.',
      validator: 'playwright',
    }));
  }

  const { chromium, expect } = playwrightModule;
  const evidenceDir = path.join(changeDir, '.openspec-validation', 'playwright');
  await fs.mkdir(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: ValidationScenarioResult[] = [];

  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const fileStem = `${scenario.requirementId}-${sanitizeFileName(scenario.scenarioTitle)}`;
      const screenshotPath = path.join(evidenceDir, `${fileStem}.png`);

      try {
        for (const step of scenario.steps) {
          if (step.action === 'goto') {
            await page.goto(new URL(step.path ?? '/', config.baseUrl).toString(), { waitUntil: 'domcontentloaded' });
            continue;
          }

          if (step.action === 'fill-new-todo') {
            await page.getByTestId('new-todo-input').fill(step.todoTitle ?? '');
            continue;
          }

          if (step.action === 'click-add-todo') {
            await page.getByTestId('add-todo-button').click();
            continue;
          }

          const todoItem = page
            .locator('[data-testid="todo-item"]')
            .filter({ has: page.getByText(step.todoTitle ?? '', { exact: true }) })
            .first();

          if (step.action === 'toggle-todo') {
            await todoItem.getByRole('checkbox').click();
            continue;
          }

          if (step.action === 'delete-todo') {
            await todoItem.getByRole('button', { name: /delete/i }).click();
            continue;
          }

          if (step.action === 'assert-visible') {
            await expect(todoItem).toBeVisible();
            continue;
          }

          if (step.action === 'assert-completed') {
            await expect(todoItem).toHaveAttribute('data-completed', 'true');
            continue;
          }

          if (step.action === 'assert-absent') {
            await expect(todoItem).toHaveCount(0);
          }
        }

        await page.screenshot({ path: screenshotPath, fullPage: true });
        results.push({
          requirementId: scenario.requirementId,
          requirementTitle: scenario.requirementTitle,
          scenarioTitle: scenario.scenarioTitle,
          status: 'PASS',
          evidence: [{ label: 'Playwright screenshot', path: path.relative(changeDir, screenshotPath) }],
          validator: 'playwright',
        });
      } catch (error) {
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
        results.push({
          requirementId: scenario.requirementId,
          requirementTitle: scenario.requirementTitle,
          scenarioTitle: scenario.scenarioTitle,
          status: 'FAIL',
          evidence: [{ label: 'Playwright screenshot', path: path.relative(changeDir, screenshotPath) }],
          reason: error instanceof Error ? error.message : String(error),
          validator: 'playwright',
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

function sanitizeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

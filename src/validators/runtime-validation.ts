import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { promises as fs } from 'fs';
import type { ValidationConfig, ValidationScenario, ValidationScenarioResult } from './types.js';
import { collectValidationScenarios } from './midscene/scenario-to-yaml.js';
import { runMidsceneValidation } from './midscene/runner.js';
import { runPlaywrightValidation } from './playwright/runner.js';
import { generatePlaywrightSpec } from './playwright/codegen-from-trace.js';
import { collectSpecCoverage } from './report/spec-coverage.js';
import { renderValidationReport } from './report/writeback.js';

export type ValidationTarget = 'midscene' | 'playwright' | 'all';

export interface ValidateRuntimeOptions {
  target: ValidationTarget;
}

/**
 * Resolve a change identifier or absolute/relative path into a concrete change directory.
 */
export function resolveChangePath(changeRef: string): string {
  const absoluteRef = path.resolve(changeRef);
  if (existsSync(absoluteRef)) {
    return absoluteRef;
  }

  return path.join(process.cwd(), 'openspec', 'changes', changeRef);
}

/**
 * Execute runtime validation for a single change directory and write validation.md.
 */
export async function validateRuntimeChange(
  changeRef: string,
  options: ValidateRuntimeOptions
): Promise<{ changeDir: string; scenarios: ValidationScenario[]; results: ValidationScenarioResult[]; validationPath: string }> {
  const changeDir = resolveChangePath(changeRef);
  const config = readValidationConfig(findProjectRoot(changeDir));
  const scenarios = await collectValidationScenarios(changeDir);

  if (scenarios.length === 0) {
    throw new Error(`No executable scenarios found in ${path.join(changeDir, 'specs')}`);
  }

  const results: ValidationScenarioResult[] = [];
  if (options.target === 'midscene' || options.target === 'all') {
    results.push(...await runMidsceneValidation(changeDir, scenarios, config));
  }
  if (options.target === 'playwright' || options.target === 'all') {
    results.push(...await runPlaywrightValidation(changeDir, scenarios, config));
  }

  const projectRoot = findProjectRoot(changeDir);
  const coverage = await collectSpecCoverage(projectRoot).catch(() => []);
  const report = renderValidationReport(results, coverage);
  const validationPath = path.join(changeDir, 'validation.md');
  await fs.writeFile(validationPath, report, 'utf-8');

  const resultsPath = path.join(changeDir, '.openspec-validation', 'results.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf-8');

  return { changeDir, scenarios, results, validationPath };
}

/**
 * Generate a Playwright spec file from compiled scenarios and prior validation results.
 */
export async function freezeRuntimeValidation(changeRef: string): Promise<string> {
  const changeDir = resolveChangePath(changeRef);
  const config = readValidationConfig(findProjectRoot(changeDir));
  const scenarios = await collectValidationScenarios(changeDir);
  if (scenarios.length === 0) {
    throw new Error(`No executable scenarios found in ${path.join(changeDir, 'specs')}`);
  }

  const resultsPath = path.join(changeDir, '.openspec-validation', 'results.json');
  const existingResults: ValidationScenarioResult[] = existsSync(resultsPath)
    ? JSON.parse(await fs.readFile(resultsPath, 'utf-8'))
    : [];

  return generatePlaywrightSpec(changeDir, scenarios, config, existingResults);
}

/**
 * Read validation config from openspec.config.json, falling back to localhost defaults.
 */
export function readValidationConfig(projectRoot: string): ValidationConfig {
  const configPath = path.join(projectRoot, 'openspec.config.json');
  if (!existsSync(configPath)) {
    return {
      baseUrl: 'http://127.0.0.1:3000',
      midscene: { model: 'gpt-4o', apiKeyEnv: 'OPENAI_API_KEY' },
      playwright: { configPath: 'playwright.config.ts' },
    };
  }

  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as { validation?: ValidationConfig } | undefined;
  return {
    baseUrl: raw?.validation?.baseUrl ?? 'http://127.0.0.1:3000',
    midscene: {
      model: raw?.validation?.midscene?.model ?? 'gpt-4o',
      apiKeyEnv: raw?.validation?.midscene?.apiKeyEnv ?? 'OPENAI_API_KEY',
    },
    playwright: {
      configPath: raw?.validation?.playwright?.configPath ?? 'playwright.config.ts',
    },
  };
}

/**
 * Find the nearest project root containing an openspec directory.
 */
export function findProjectRoot(startPath: string): string {
  let current = path.resolve(startPath);
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, 'openspec'))) {
      return current;
    }
    current = path.dirname(current);
  }
  throw new Error(`Could not find project root for ${startPath}`);
}

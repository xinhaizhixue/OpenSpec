import path from 'path';
import { promises as fs } from 'fs';
import type { ValidationConfig, ValidationScenario, ValidationScenarioResult } from '../types.js';
import { scenarioToMidsceneYaml } from './scenario-to-yaml.js';

/**
 * Generate Midscene YAML files and return skip results when execution is unavailable.
 */
export async function runMidsceneValidation(
  changeDir: string,
  scenarios: ValidationScenario[],
  config: ValidationConfig
): Promise<ValidationScenarioResult[]> {
  const outputDir = path.join(changeDir, '.openspec-validation', 'midscene');
  await fs.mkdir(outputDir, { recursive: true });

  const apiKeyEnv = config.midscene?.apiKeyEnv ?? 'OPENAI_API_KEY';
  const apiKey = process.env[apiKeyEnv];

  const yamlEvidence = await Promise.all(
    scenarios.map(async (scenario) => {
      const fileName = `${scenario.requirementId}-${sanitizeFileName(scenario.scenarioTitle)}.yaml`;
      const absolutePath = path.join(outputDir, fileName);
      await fs.writeFile(absolutePath, scenarioToMidsceneYaml(scenario), 'utf-8');
      return {
        scenario,
        relativePath: path.relative(changeDir, absolutePath),
      };
    })
  );

  const reason = apiKey
    ? 'Midscene YAML generated. Runtime execution is not configured in this environment yet.'
    : `Midscene skipped: set ${apiKeyEnv} to enable LLM-powered execution.`;

  return yamlEvidence.map(({ scenario, relativePath }) => ({
    requirementId: scenario.requirementId,
    requirementTitle: scenario.requirementTitle,
    scenarioTitle: scenario.scenarioTitle,
    status: 'SKIPPED',
    evidence: [{ label: 'Midscene YAML', path: relativePath }],
    reason,
    validator: 'midscene',
  }));
}

function sanitizeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

import path from 'path';
import { promises as fs } from 'fs';
import { stringify } from 'yaml';
import type { RuntimeStep, ValidationScenario } from '../types.js';

const REQUIREMENT_HEADER = /^###\s+(?:Requirement:\s*)?([A-Z0-9][A-Z0-9-]*):\s*(.+)$/;
const SCENARIO_HEADER = /^####\s+Scenario:\s*(.+)$/;
const STEP_HEADER = /^(GIVEN|WHEN|THEN|AND)\b/i;

/**
 * Parse delta spec markdown files into executable validation scenarios.
 */
export async function collectValidationScenarios(changeDir: string): Promise<ValidationScenario[]> {
  const specsDir = path.join(changeDir, 'specs');
  const scenarios: ValidationScenario[] = [];

  let entries: string[] = [];
  try {
    entries = await fs.readdir(specsDir);
  } catch {
    return scenarios;
  }

  for (const entry of entries) {
    const specPath = path.join(specsDir, entry, 'spec.md');
    try {
      const content = await fs.readFile(specPath, 'utf-8');
      scenarios.push(...parseSpecScenarios(content, path.relative(changeDir, specPath)));
    } catch {
      // Ignore missing spec files so the validator can continue gracefully.
    }
  }

  return scenarios;
}

/**
 * Parse a single spec markdown document into executable scenarios.
 */
export function parseSpecScenarios(content: string, specPath: string): ValidationScenario[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const scenarios: ValidationScenario[] = [];

  let currentRequirementId: string | undefined;
  let currentRequirementTitle: string | undefined;
  let currentScenarioTitle: string | undefined;
  let currentScenarioLines: string[] = [];

  const flushScenario = () => {
    if (!currentRequirementId || !currentRequirementTitle || !currentScenarioTitle) {
      currentScenarioLines = [];
      return;
    }

    const steps = compileScenarioSteps(currentScenarioLines);
    if (steps.length > 0) {
      scenarios.push({
        requirementId: currentRequirementId,
        requirementTitle: currentRequirementTitle,
        scenarioTitle: currentScenarioTitle,
        specPath,
        steps,
      });
    }

    currentScenarioTitle = undefined;
    currentScenarioLines = [];
  };

  for (const line of lines) {
    const requirementMatch = line.match(REQUIREMENT_HEADER);
    if (requirementMatch) {
      flushScenario();
      currentRequirementId = requirementMatch[1];
      currentRequirementTitle = requirementMatch[2].trim();
      continue;
    }

    const scenarioMatch = line.match(SCENARIO_HEADER);
    if (scenarioMatch) {
      flushScenario();
      currentScenarioTitle = scenarioMatch[1].trim();
      continue;
    }

    if (currentScenarioTitle) {
      currentScenarioLines.push(line);
    }
  }

  flushScenario();

  return scenarios;
}

/**
 * Convert a parsed validation scenario into Midscene-compatible YAML content.
 */
export function scenarioToMidsceneYaml(scenario: ValidationScenario): string {
  return stringify({
    id: scenario.requirementId,
    requirement: scenario.requirementTitle,
    scenario: scenario.scenarioTitle,
    specPath: scenario.specPath,
    steps: scenario.steps.map((step) => ({
      action: step.action,
      todoTitle: step.todoTitle,
      path: step.path,
      source: step.source,
    })),
  });
}

function compileScenarioSteps(lines: string[]): RuntimeStep[] {
  const steps: RuntimeStep[] = [];
  let previousKeyword: 'GIVEN' | 'WHEN' | 'THEN' | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const cleaned = line.replace(/^- /, '').replace(/\*\*/g, '');
    const match = cleaned.match(STEP_HEADER);
    if (!match) {
      continue;
    }

    const keyword = (match[1].toUpperCase() === 'AND' ? previousKeyword : match[1].toUpperCase()) as
      | 'GIVEN'
      | 'WHEN'
      | 'THEN'
      | undefined;
    previousKeyword = keyword;

    const sentence = cleaned.replace(STEP_HEADER, '').replace(/^:\s*/, '').trim();
    const compiled = compileStep(keyword, sentence);
    if (compiled) {
      steps.push(compiled);
    }
  }

  return steps;
}

function compileStep(keyword: 'GIVEN' | 'WHEN' | 'THEN' | undefined, sentence: string): RuntimeStep | null {
  const quotedTodo = sentence.match(/"([^"]+)"/)?.[1];

  if (keyword === 'GIVEN' && /(open|visit|load).*(todo app|home page|page)/i.test(sentence)) {
    return { action: 'goto', path: '/', source: sentence };
  }

  if (keyword === 'WHEN' && quotedTodo && /(add|enter|type).*(todo|task)/i.test(sentence)) {
    return { action: 'fill-new-todo', todoTitle: quotedTodo, source: sentence };
  }

  if (keyword === 'WHEN' && /(click|submit|press).*(add|create)/i.test(sentence)) {
    return { action: 'click-add-todo', source: sentence };
  }

  if (keyword === 'WHEN' && quotedTodo && /(check|mark).*(complete|completed)/i.test(sentence)) {
    return { action: 'toggle-todo', todoTitle: quotedTodo, source: sentence };
  }

  if (keyword === 'WHEN' && quotedTodo && /(delete|remove).*(todo|task)/i.test(sentence)) {
    return { action: 'delete-todo', todoTitle: quotedTodo, source: sentence };
  }

  if (keyword === 'THEN' && quotedTodo && /(visible|listed|shown|appears?)/i.test(sentence)) {
    return { action: 'assert-visible', todoTitle: quotedTodo, source: sentence };
  }

  if (keyword === 'THEN' && quotedTodo && /(complete|completed|checked off)/i.test(sentence)) {
    return { action: 'assert-completed', todoTitle: quotedTodo, source: sentence };
  }

  if (keyword === 'THEN' && quotedTodo && /(removed|deleted|absent|not shown|not visible)/i.test(sentence)) {
    return { action: 'assert-absent', todoTitle: quotedTodo, source: sentence };
  }

  return null;
}

/**
 * Supported runtime validation status values.
 */
export type ValidationStatus = 'PASS' | 'FAIL' | 'SKIPPED';

/**
 * Discrete scenario step kinds compiled from Given/When/Then text.
 */
export type RuntimeStepAction =
  | 'goto'
  | 'fill-new-todo'
  | 'click-add-todo'
  | 'toggle-todo'
  | 'delete-todo'
  | 'assert-visible'
  | 'assert-completed'
  | 'assert-absent';

/**
 * A compiled runtime step for a scenario.
 */
export interface RuntimeStep {
  /** The deterministic action to execute. */
  action: RuntimeStepAction;
  /** Optional todo title associated with the step. */
  todoTitle?: string;
  /** Optional navigation path. */
  path?: string;
  /** Original natural-language step text. */
  source: string;
}

/**
 * A parsed scenario with its associated requirement metadata.
 */
export interface ValidationScenario {
  /** Stable requirement identifier, e.g. REQ-TODO-001. */
  requirementId: string;
  /** Human-readable requirement title. */
  requirementTitle: string;
  /** Scenario heading text. */
  scenarioTitle: string;
  /** Source spec file relative path. */
  specPath: string;
  /** Ordered runtime steps compiled from Given/When/Then. */
  steps: RuntimeStep[];
}

/**
 * Evidence produced while validating a scenario.
 */
export interface ValidationEvidence {
  /** Human-readable evidence label. */
  label: string;
  /** Relative path from the change directory. */
  path: string;
}

/**
 * Scenario validation result written back into validation.md.
 */
export interface ValidationScenarioResult {
  /** Stable requirement identifier. */
  requirementId: string;
  /** Human-readable requirement title. */
  requirementTitle: string;
  /** Scenario heading text. */
  scenarioTitle: string;
  /** PASS / FAIL / SKIPPED. */
  status: ValidationStatus;
  /** Evidence paths produced during validation. */
  evidence: ValidationEvidence[];
  /** Optional failure or skip reason. */
  reason?: string;
  /** Validator responsible for this result. */
  validator: 'midscene' | 'playwright';
}

/**
 * Runtime validation configuration sourced from openspec.config.json.
 */
export interface ValidationConfig {
  /** Base URL for browser-based validation. */
  baseUrl: string;
  /** Optional Midscene configuration. */
  midscene?: {
    /** Model identifier passed through to Midscene tooling. */
    model?: string;
    /** Environment variable name containing the API key. */
    apiKeyEnv?: string;
  };
  /** Optional Playwright configuration. */
  playwright?: {
    /** Optional external Playwright config path. */
    configPath?: string;
  };
}

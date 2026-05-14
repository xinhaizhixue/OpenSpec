import { describe, expect, it } from 'vitest';
import {
  parseSpecScenarios,
  scenarioToMidsceneYaml,
} from '../../src/validators/midscene/scenario-to-yaml.js';

describe('scenario-to-yaml', () => {
  it('parses stable requirement ids and compiles todo runtime steps', () => {
    const scenarios = parseSpecScenarios(
      `## ADDED Requirements

### REQ-TODO-001: Add todo items
The system SHALL allow adding todos.

#### Scenario: Add a todo item
- **GIVEN** the user opens the todo app
- **WHEN** the user adds todo "Buy milk"
- **AND** clicks the add button
- **THEN** todo "Buy milk" is visible
`,
      'specs/todos/spec.md'
    );

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]).toMatchObject({
      requirementId: 'REQ-TODO-001',
      requirementTitle: 'Add todo items',
      scenarioTitle: 'Add a todo item',
    });
    expect(scenarios[0].steps.map((step) => step.action)).toEqual([
      'goto',
      'fill-new-todo',
      'click-add-todo',
      'assert-visible',
    ]);
  });

  it('serializes compiled scenarios into Midscene yaml', () => {
    const [scenario] = parseSpecScenarios(
      `## ADDED Requirements

### REQ-TODO-002: Complete todo items
The system SHALL allow completing todos.

#### Scenario: Complete a todo item
- **GIVEN** the user opens the todo app
- **WHEN** the user checks todo "Buy milk" as complete
- **THEN** todo "Buy milk" is completed
`,
      'specs/todos/spec.md'
    );

    const yaml = scenarioToMidsceneYaml(scenario);

    expect(yaml).toContain('id: REQ-TODO-002');
    expect(yaml).toContain('action: toggle-todo');
    expect(yaml).toContain('todoTitle: Buy milk');
  });
});

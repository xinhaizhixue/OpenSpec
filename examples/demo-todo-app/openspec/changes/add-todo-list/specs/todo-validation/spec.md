## ADDED Requirements

### REQ-TODO-001: Add todo items
The system SHALL allow users to create todos without logging in.

#### Scenario: Add a todo item
- **GIVEN** the user opens the todo app
- **WHEN** the user adds todo "Buy milk"
- **AND** clicks the add button
- **THEN** todo "Buy milk" is visible

### REQ-TODO-002: Complete todo items
The system SHALL allow users to mark a todo as completed.

#### Scenario: Complete a todo item
- **GIVEN** the user opens the todo app
- **WHEN** the user adds todo "Buy milk"
- **AND** clicks the add button
- **WHEN** the user checks todo "Buy milk" as complete
- **THEN** todo "Buy milk" is completed

### REQ-TODO-003: Delete todo items
The system SHALL allow users to delete a todo from the list.

#### Scenario: Delete a todo item
- **GIVEN** the user opens the todo app
- **WHEN** the user adds todo "Buy milk"
- **AND** clicks the add button
- **WHEN** the user deletes todo "Buy milk"
- **THEN** todo "Buy milk" is absent

import { describe, expect, it } from 'vitest';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { collectSpecCoverage } from '../../src/validators/report/spec-coverage.js';

describe('spec coverage', () => {
  it('collects @spec annotations outside openspec metadata folders', async () => {
    const tempDir = path.join(os.tmpdir(), `openspec-coverage-${randomUUID()}`);
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });

    try {
      await fs.writeFile(
        path.join(tempDir, 'src', 'todo.ts'),
        `// @spec REQ-TODO-001\nexport const value = 1;\n// @spec REQ-TODO-001\n`
      );
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'changes', 'ignored.ts'),
        '// @spec REQ-IGNORED-001\n'
      );

      const coverage = await collectSpecCoverage(tempDir);
      expect(coverage).toEqual([
        {
          requirementId: 'REQ-TODO-001',
          references: ['src/todo.ts'],
        },
      ]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

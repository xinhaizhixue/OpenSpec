import path from 'path';
import { promises as fs } from 'fs';

export interface SpecCoverageEntry {
  requirementId: string;
  references: string[];
}

/**
 * Scan source files for @spec REQ-... annotations and build a simple coverage map.
 */
export async function collectSpecCoverage(projectRoot: string): Promise<SpecCoverageEntry[]> {
  const matches = new Map<string, string[]>();
  await walk(projectRoot, async (filePath) => {
    if (shouldSkip(filePath, projectRoot)) {
      return;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const pattern = /@spec\s+([A-Z0-9-]+)/g;
    for (const match of content.matchAll(pattern)) {
      const requirementId = match[1];
      const references = matches.get(requirementId) ?? [];
      references.push(path.relative(projectRoot, filePath));
      matches.set(requirementId, references);
    }
  });

  return Array.from(matches.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([requirementId, references]) => ({
      requirementId,
      references: Array.from(new Set(references)).sort(),
    }));
}

async function walk(root: string, visitor: (filePath: string) => Promise<void>): Promise<void> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      await walk(fullPath, visitor);
      continue;
    }
    await visitor(fullPath);
  }
}

function shouldSkip(filePath: string, projectRoot: string): boolean {
  const relativePath = path.relative(projectRoot, filePath);
  return relativePath.startsWith(`openspec${path.sep}`) || relativePath.endsWith('.png');
}

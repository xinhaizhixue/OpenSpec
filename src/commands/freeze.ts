import path from 'path';
import { freezeRuntimeValidation } from '../validators/runtime-validation.js';

export class FreezeCommand {
  async execute(changeRef: string | undefined): Promise<void> {
    if (!changeRef) {
      throw new Error('Missing required argument <change-id>');
    }

    const outputPath = await freezeRuntimeValidation(changeRef);
    console.log(`Generated Playwright spec: ${path.relative(process.cwd(), outputPath)}`);
  }
}

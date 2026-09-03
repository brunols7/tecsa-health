import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const CORE_DIR = join(ROOT, 'src', 'core');

function runLint(): { status: number; output: string } {
  try {
    const output = execSync('npm run lint', { cwd: ROOT, encoding: 'utf-8' });
    return { status: 0, output };
  } catch (error) {
    const execError = error as { status: number | null; stdout: string; stderr: string };
    return { status: execError.status ?? 1, output: `${execError.stdout}${execError.stderr}` };
  }
}

function runBoundaryScript(): { status: number; output: string } {
  try {
    const output = execSync('bash scripts/check-brand-boundary.sh', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    return { status: 0, output };
  } catch (error) {
    const execError = error as { status: number | null; stdout: string; stderr: string };
    return { status: execError.status ?? 1, output: `${execError.stdout}${execError.stderr}` };
  }
}

describe('fronteira de marca em src/core', () => {
  it('caso limpo: sem violação, lint e o script de fronteira passam', () => {
    const lintResult = runLint();
    const boundaryResult = runBoundaryScript();

    expect(lintResult.status).toBe(0);
    expect(boundaryResult.status).toBe(0);
  });

  it('import de brands/* em core/ é pego pelo ESLint (no-restricted-imports)', () => {
    const fixtureDir = mkdtempSync(join(CORE_DIR, '__fixture-import-'));
    const fixtureFile = join(fixtureDir, 'bad-import.ts');
    writeFileSync(
      fixtureFile,
      "import { nutriCareBrand } from '@/brands/nutri-care';\n\nexport const x = nutriCareBrand;\n",
    );

    try {
      const result = runLint();
      expect(result.status).not.toBe(0);
      expect(result.output).toContain('no-restricted-imports');
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('import bare de brands (sem sufixo /*) em core/ é pego pelo ESLint (no-restricted-imports)', () => {
    const fixtureDir = mkdtempSync(join(CORE_DIR, '__fixture-bare-import-'));
    const fixtureFile = join(fixtureDir, 'bad-bare-import.ts');
    writeFileSync(
      fixtureFile,
      "import { resolveBrand } from '@/brands';\n\nexport const x = resolveBrand('nutri-care');\n",
    );

    try {
      const result = runLint();
      expect(result.status).not.toBe(0);
      expect(result.output).toContain('no-restricted-imports');
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('nome de marca em comentário dentro de core/ é pego pelo script de grep', () => {
    const fixtureDir = mkdtempSync(join(CORE_DIR, '__fixture-comment-'));
    const fixtureFile = join(fixtureDir, 'leaky-comment.ts');
    writeFileSync(fixtureFile, '// TODO: revisar cor da nutri-care aqui\nexport const noop = true;\n');

    try {
      const result = runBoundaryScript();
      expect(result.status).not.toBe(0);
      expect(result.output.toLowerCase()).toContain('nutri-care');
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});

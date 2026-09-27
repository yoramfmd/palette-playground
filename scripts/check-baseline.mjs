import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--test', 'tests/*.test.mjs'], {
  cwd: new URL('..', import.meta.url),
  shell: true,
  stdio: 'inherit'
});

process.exit(result.status ?? 1);

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const childProcess = require('child_process');
const crypto = require('crypto');
const syncTestdata = require('./lib/sync-testdata');

async function run() {
  try {
    const projectRoot = path.join(__dirname, '..');
    const dataTarget = path.join(__dirname, 'data');

    await fs.rmdir(dataTarget, { recursive: true });
    await fs.mkdir(dataTarget, { recursive: true });

    if (process.env.CI) {
      const all = await syncTestdata();
      console.info('! Using fallback before build in CI, copied:', all);
    }

    const options = { cwd: projectRoot, stdio: 'inherit' };
    const scripts = (await glob('build/*.js', { cwd: __dirname })).sort();

    const hash = crypto.createHash('sha256');
    const allFiles = (await glob('data/**/*', { cwd: __dirname })).sort();

    if (!allFiles.length) {
      throw new Error('No files generated, cowardly refusing to hash');
    }

    for (const script of scripts) {
      const scriptPath = path.join(__dirname, script);
      console.info(`> Running ${scriptPath}`);
      try {
        childProcess.execFileSync('node', [scriptPath], options);
      } catch (e) {
        console.error(`! Failed to execute "${script}" (${e.status}):`, e.message);
      }
    }

    for (const f of allFiles) {
      const filePath = path.join(__dirname, f);
      const bytes = await fs.readFile(filePath);
      hash.update(bytes);
    }

    const digest = hash.digest('hex');
    console.info(`@ Generated digest=${digest} for ${allFiles.length} files:`, allFiles);
    await fs.writeFile(path.join(__dirname, 'data/.hash'), digest);

  } catch (err) {
    console.error('An error occurred:', err);
    process.exitCode = 1;
  }

  const payload =
    '// This file blocks synchronizing local data, because you ran `npm run build-external`.\n' +
    '// Delete it to bring back automatic sync when you run `npm run dev`.';
  await fs.writeFile(path.join(__dirname, 'local-build-flag'), payload);
}

run();

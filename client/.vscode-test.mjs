import { readFileSync } from 'node:fs';
import { defineConfig } from '@vscode/test-cli';
import { minVersion } from 'semver';

const { engines } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const version = process.env.VSCODE_TEST_VERSION === 'minimum'
    ? minVersion(engines.vscode).version
    : 'stable';

export default defineConfig(['failing', 'passing'].map(fixture => ({
    label: fixture,
    files: fixture === 'failing' ? 'out/test/**/*.test.js' : 'out/test/smoke.test.js',
    version,
    workspaceFolder: `test-fixtures/${fixture}`,
    extensionDevelopmentPath: '.',
    launchArgs: ['--disable-extensions', '--disable-workspace-trust'],
    mocha: { ui: 'tdd', timeout: 120_000 },
})));

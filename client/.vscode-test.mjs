import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/**/*.test.js',
    version: 'stable',
    workspaceFolder: 'test-fixtures/failing',
    extensionDevelopmentPath: '.',
    launchArgs: ['--disable-extensions', '--disable-workspace-trust'],
    mocha: { timeout: 120_000 },
});

import eslint from '@eslint/js';
import typescriptEslint from 'typescript-eslint';

export default typescriptEslint.config(
    { ignores: ['vscode.proposed.d.ts'] },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, typescriptEslint.configs.recommended],
        rules: {
            semi: ['error', 'always'],
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-namespace': 'off',
            'no-inner-declarations': 'off',
        },
    },
);

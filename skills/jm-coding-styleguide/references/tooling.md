# Tooling

Mechanical rules belong to tools, because a style guide can fall out of context and a linter cannot. Copy these into a repo that lacks them; in a repo that has its own config, add only the missing rules.

## ESLint (flat config)

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // No `switch`: use if blocks or a Record lookup.
      'no-restricted-syntax': [
        'error',
        { selector: 'SwitchStatement', message: 'Use if blocks or a Record lookup instead of switch.' },
      ],
      // Always braces, never `if (x) return y;`.
      curly: ['error', 'all'],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
```

Non-Next packages: keep the same `rules` block on top of `typescript-eslint` recommended. Keep `prettier` before the `rules` block so it cannot switch these rules off.

## Prettier

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSameLine": true,
  "importOrder": ["(.*)css$", "next(.*)$", "react(.*)$", "<THIRD_PARTY_MODULES>", "^@/(.*)$", "^[./]"],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true,
  "plugins": ["@trivago/prettier-plugin-sort-imports"],
  "importOrderParserPlugins": ["typescript", "jsx", "decorators-legacy"]
}
```

In a monorepo add `"^@scope/(.*)$"` before `"^@/(.*)$"`. Existing `.prettierrc` wins over this one (the newest repo runs Prettier defaults, double quotes).

## Vitest

```ts
// vitest.config.ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- Scripts: `"test": "vitest run"`. React DOM tests use `environment: 'jsdom'` per file and Testing Library.
- Colocate `thing.test.ts` next to `thing.ts`; test wrappers by mocking `next/headers` and the auth module.
- Jest only if the repo already runs it (`ts-jest`, `@jest-environment jsdom` docblock). Do not migrate unasked.

## Not lintable, still a rule

No em dashes: `grep -rnP '\x{2014}' src docs` before finishing, and replace each with a comma, colon or period.

## Scripts and hooks

Root `package.json`: `lint`, `typecheck` (`tsc --noEmit`), `test`, `format`, `format:check`. Husky pre-commit: `pnpm test`, `pnpm tsc --noEmit`, `npx branch-name-lint .branch-name-lintrc` (branches use conventional prefixes: `feat/`, `fix/`, `chore/`).

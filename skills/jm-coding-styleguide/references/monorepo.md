# Repo layout

Two layouts, both in use. Start with the single app; move to the monorepo when a second deployable (API, mobile app) needs the same schemas.

## Monorepo (pnpm + turbo)

```
apps/
  api/          deployable (Hono + oRPC), owns domain services
  web/          Next.js
  mobile/       Expo
packages/
  schemas/      zod schemas, the source of truth for shapes
  types/        `export type *` inferred from schemas
  api-contract/ oRPC contract: input/output schemas per route, no logic
  db/           Drizzle client, schema, migrations, *DbService classes
  env/          the one validated `envVariables`
  auth/ analytics/ constants/ design-tokens/
infrastructure/ cloud config (cloudflare, gcp)
```

- `pnpm-workspace.yaml`: `apps/*` and `packages/*`. Root `package.json` pins `packageManager` and `engines.node`, and only delegates: `"build": "turbo build"`, same for `dev lint typecheck test`; `format` and `format:check` run Prettier at the root.
- `turbo.json`: `build` depends on `^build`, `lint` and `typecheck` on `^lint`/`^typecheck`, `dev` is `persistent` with `cache: false`. An app overrides only its `outputs` with `"extends": ["//"]`.
- Internal package, every time:
  ```json
  {
    "name": "@scope/schemas",
    "private": true,
    "type": "module",
    "exports": { ".": "./src/index.ts" },
    "types": "./src/index.ts",
    "scripts": { "typecheck": "tsc --noEmit" },
    "dependencies": { "@scope/constants": "workspace:*" }
  }
  ```
  No build step: consumers compile the TypeScript source. Heavier or server-only entry points get a sub-path export (`@scope/analytics/server`, `@scope/db/schema`).
- Dependencies point one way: apps depend on packages, packages never on apps. `constants` -> `schemas` -> `types` / `api-contract`; `env` -> `db` -> `auth`.
- Contract first: define input and output in `schemas`, expose them in `api-contract`, then implement in `apps/api` and call from the clients. Never redeclare a shape in an app.
- CI order: `format:check`, then `turbo run typecheck lint test`, then `turbo run build` (separate runs, because Next typegen and build race).
- Tests live in the package they cover; `pnpm test` runs them all through turbo.

## Single Next.js app (`src/`)

```
app/             routes; colocate _components/, _actions/, _utils/ next to the route that owns them
features/        large reusable modules with their own components, actions, schemas
infrastructure/  db/, auth/, email/, payments/, rate-limit/, logger.ts, <vendor>/
ui/              shared presentational components
utilities/       cross-cutting helpers and withX wrappers, one folder each
schemas/ types/ constants/ styles/
environment-variables.ts
```

- Import across folders with the `@/` alias (`@/*` -> `src/*`).
- A folder per helper (`utilities/cn/index.ts` plus `cn.test.ts`); public routes are an enum, `constants/path.enum.ts`, with a URL composer instead of string concatenation.
- Route groups `(landing)`, `(auth)`, `(legal)` separate layouts, not logic.

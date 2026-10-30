---
name: jm-coding-styleguide
description: "Use when writing, reviewing or refactoring TypeScript, React or Next.js code in JM's projects: features, server actions, API routes, DB or third-party integrations, new packages or apps in a pnpm/turbo monorepo, tests, lint setup. Covers JM's control-flow style, withX wrappers (withAuth, withProtectedAction), static service classes and monorepo layout. An existing repo convention or the user's request wins. Not for Python, shell or other languages."
---

# JM coding style

Code in these projects is boring on purpose: explicit boundaries, small wrappers for cross-cutting work, one class per external system. Where the repo already does something differently, follow the repo and say so; where this guide is silent, copy the nearest existing file.

## Rules for every change

1. **No `switch`.** Use `if` blocks, or a `Record` lookup when mapping a value to a value.
2. **Always braces.** Never `if (x) return y;` on one line.
3. **Success inside the `if`, fall-through is the default** (usually a throw). Early guard clauses for preconditions (auth, validation) are fine, still with braces.
   ```ts
   // wrong
   if (!result.success) return null;
   return result.data;

   // right
   if (result.success) {
     return result.data;
   }

   throw new Error('Could not save the record');
   ```
4. **Validate every boundary with `zod`**: HTTP bodies, server action payloads and results, third-party responses, env vars. The system must stay safe first (controlled input, graceful errors, logs), then fast.
5. **External systems live in static service classes**, scoped to a domain (`PageDbService`, `EmailService`). No loose helper functions that call a DB or API. Read `references/services.md` before touching one.
6. **Cross-cutting work lives in `withX` wrappers** (auth, validation, rate limit, captcha, retries): one concern each, generic types, no `any` without a comment. Read `references/wrappers.md` before adding auth or a server action.
7. **Expected failures are values, bugs are throws.** Server actions return `{ data, failure }`; third-party calls return a `{ success, status, data, error }` union; the UI shows `failure.message` instead of try/catch.
8. **One env module** (`createEnv` from `@t3-oss/env-*`, exported as `envVariables`). No `process.env` elsewhere except runtime flags like `VERCEL_ENV`.
9. **Log with pino**, context object first: `logger.error({ userId, error }, 'message')`. No `console.*`. Never log secrets or full third-party payloads.
10. **Types:** inline type imports (`import { type Foo }`), derive types from schemas (`z.infer`), `@ts-expect-error` only with a description.
11. **Naming:** kebab-case files; `_` prefix for module-private items (`_Input`, `_apiUrl`); schemas end in `Schema`, payloads in `PayloadSchema`/`ResultSchema`.
12. **Tests:** Vitest, colocated `*.test.ts(x)`. Jest only when the repo already has it. Never `node:test`.
13. **No em dashes** in comments, copy or docs. Use a comma, colon or period.

Rules 1, 2, 10 and `no-console` are lint rules. Add them from `references/tooling.md` when setting up or repairing a repo; keep following them where the linter is missing.

## Read by situation

| The task | Read |
| --- | --- |
| New repo, new package, "where does this file go", monorepo wiring | `references/monorepo.md` |
| Server action, protected page, rate limit, captcha, retry, any `withX` | `references/wrappers.md` |
| DB query, 3rd-party API/SDK, email, storage, payments, env vars | `references/services.md` |
| Component, page, route handler, form, caching/revalidation | `references/react-next.md` |
| ESLint, Prettier, Vitest config, CI | `references/tooling.md` |

Read each file once, only the ones the task touches. Review work: check the diff against the rules above first, then the matching file; report each hit as file, rule, fix.

## Gotchas

- Props are `type XProps` with `FC<XProps>`, not `interface` (all four repos do this).
- Server-only modules start with `import 'server-only'`; client files start with `'use client'`; actions with `'use server'`.
- Next route `params` is a `Promise`: `const { slug } = await params`.
- After a mutation, revalidate in the same function that mutates.
- This guide is for TypeScript web/API code. Visual design, animation and copy tone belong to other skills.

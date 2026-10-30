# Service classes and integrations

Every external system (DB, storage, email, payments, AI, third-party HTTP API) is reached through one static class, scoped to a domain. Why: one place to change when the vendor changes, one place to mock in tests, no helper functions "flying around" the codebase. Do not write standalone functions that call a client directly.

| Kind | Name | Lives in |
| --- | --- | --- |
| DB access | `PageDbService`, `CarDbService` | `infrastructure/db/services/` (monorepo: `packages/db/src/services/`) |
| Vendor wrapper | `EmailService`, `FileStorageService`, `CalComIntegration` | `infrastructure/<vendor>/` |
| Domain orchestration (several services plus rules) | `OrganizationInvitationTokenService` | `apps/api/src/services/` or `features/<x>/` |

## DB service

```ts
// infrastructure/db/services/index.ts
import 'server-only';

import { db } from '..';

export class DbService {
  protected static client = db;
}

// infrastructure/db/services/page.ts
export class PageDbService extends DbService {
  static async getById(id: string) {
    const [page] = await this.client.select().from(pages).where(eq(pages.id, id)).limit(1);

    return page ?? null;
  }
}
```

- Methods are `static async`, take one object argument once there are two or more parameters, and use `this.client`.
- Single-row reads return `row ?? null`, never `.pop()` and never `undefined`.
- Shared helpers (pagination) go on the base `DbService`.
- Scope every read by the owner (`userId`, `stationId`) as a required argument, e.g. `getCarById({ stationId, id })`.
- Monorepo: export the classes from the package `index.ts`; callers import `{ CarDbService } from '@scope/db'`.

## Domain service

Use when a flow touches several services or enforces a rule. Static class, `static #private` for internals, throws a typed error:

```ts
throw new ApiError('You cannot invite members.', 403, 'FORBIDDEN');
```

`ApiError(message, status, code)` extends `Error`, code is a closed union (`BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | INTERNAL_SERVER_ERROR`).

One boundary (oRPC middleware, route handler) maps `ApiError` to the transport error, hides unknown errors behind a generic 500 and logs the original once.

## Vendor wrapper

```ts
const resend = new Resend(envVariables.RESEND_API_KEY);

export class EmailService {
  protected static client = resend;

  static async sendEmail(...data: Parameters<typeof this.client.emails.send>) {
    return await this.client.emails.send(...data);
  }
}
```

Create the client once at module level (or as a `private static readonly` field), read secrets from `envVariables`, expose only the operations the app uses.

## Raw HTTP API (no SDK, or SDK not Edge-safe)

Static class, URL builder instead of string concat, zod schema per response, discriminated union result:

```ts
const data = await response.json();

if (response.ok) {
  return { success: true, status: response.status, data: GetMeResponseSchema.parse(data), error: null } as const;
}

return { success: false, status: response.status, data: null, error: GetMeErrorSchema.parse(data) } as const;
```

A `fetchImpl = fetch` parameter makes it testable. Time-box calls with `AbortSignal.timeout` and map vendor errors to your own outcomes (`valid | invalid | unavailable`) here.

## Env

One module, validated at import, shared by all services:

```ts
export const envVariables = createEnv({
  server: { DATABASE_URL: z.string().min(1), RESEND_API_KEY: z.string().min(1) },
  client: { NEXT_PUBLIC_ROOT_DOMAIN: z.string() },
  emptyStringAsUndefined: true,
  runtimeEnv: { /* every key, from process.env */ },
});
```

Optional integrations are `.optional()` and the code path degrades explicitly (feature off, 503), never silently. Monorepo: the module is the `env` package, imported as `@scope/env`.

Public endpoints with many dependencies (rate limit, captcha, store) take a `deps` object: real services in `index.ts`, fakes in tests.

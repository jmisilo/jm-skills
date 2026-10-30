# `withX` wrappers

A wrapper takes a handler plus options and returns a function with the same call shape, so call sites stay one expression. One concern per wrapper; stack them for more.

| Wrapper | Wraps | Concern | Lives in |
| --- | --- | --- | --- |
| `withAuth` | RSC page or component | session or redirect, injects `user` | `utilities/auth/with-auth.tsx` |
| `withProtectedAction` | server action | session, payload and output validation, `{ data, failure }`, logging | `utilities/with-protected-action/index.ts` |
| `withTurnstile` | server action | captcha token check, token is the first argument | `utilities/turnstile/with-turnstile.ts` |
| `withRateLimit` | request in `proxy.ts` | per-IP limit, returns a response or `undefined` | `utilities/rate-limit/with-rate-limit.ts` |
| `withReplies` | any async function | retry N times, log each attempt, rethrow the last | next to its feature |

Add a new wrapper when the same glue appears in a third place. Each has a colocated `*.test.ts(x)` that mocks `next/headers` and the auth module.

## Server action

```ts
'use server';

export const updatePageSchema = withProtectedAction(
  async ({ user, ...payload }) => {
    const result = await PageDbService.updatePageSchema(payload);

    if (result) {
      revalidatePath(Path.Builder);

      return { data: result, failure: null };
    }

    throw new Error('Page schema not updated');
  },
  {
    actionId: 'update-page-schema',
    schemas: { payload: UpdatePageSchemaPayloadSchema, output: UpdatePageSchemaResultSchema },
  },
);
```

Rules: handler gets the validated payload plus `user`; returns `{ data, failure: null }`; throws for bugs; `actionId` is kebab-case and unique; the schemas live in `schemas/`, never inline.

## Wrapper skeleton (`withProtectedAction`, trimmed)

```ts
import 'server-only';

type Success<T extends object> = { data: T; failure: null };
type Failure = { data: null; failure: { message: string } };

export const withProtectedAction = <
  P extends Record<string, unknown>,
  O extends Record<string, unknown>,
  T extends (payload: P & { user: User }) => Promise<Success<O> | Failure>,
>(
  handler: T,
  { actionId, schemas }: { actionId: string; schemas: { payload: z.ZodType<P>; output: z.ZodType<O> } },
) => {
  return async (_payload: P): Promise<Success<O> | Failure> => {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      logger.error({ actionId, cause: 'auth' }, 'Action failed');

      return { data: null, failure: { message: 'Unauthorized' } };
    }

    const { success, data: payload, error } = schemas.payload.safeParse(_payload);

    if (success) {
      return await handler({ ...payload, user: session.user });
    }

    logger.error({ actionId, cause: 'payload validation', error: error.message }, 'Action failed');

    return { data: null, failure: { message: 'Payload do not match requirements' } };
  };
};
```

The real ones also `safeParse` the output, and wrap the handler in `try/catch` that logs `cause: 'handler execution'` and rethrows (non-`Error` values become `new Error('Internal server error')`).

## `withAuth` (RSC)

```tsx
const DashboardPage = withAuth(
  async ({ user }) => {
    const profile = await UserDbService.getProfile(user.id);
    // ...
  },
  { id: 'dashboard-page' },
);

export default DashboardPage;
```

Signature: `withAuth(Component, { id?, reverse? })`. No session redirects to `Path.Login`; `reverse: true` is for login/register pages and redirects signed-in users to the app. Extra props, e.g. `params`, go through the generic: `withAuth<{ params: Promise<{ id: string }> }>(...)`.

## Client side

Call actions inside `startTransition`, show `result.failure.message` (toast if there is no place for it), reset captcha state after success. Captcha: `withTurnstile(handler)` makes the action `(token, ...args)`; pair it with a `useFormTurnstile` hook.

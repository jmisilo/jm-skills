# React and Next.js

## Components

```tsx
type ButtonProps = PropsWithChildren<{ theme?: ButtonTheme; loading?: boolean }>;

const THEME_CLASS_NAME: Record<ButtonTheme, string> = {
  primary: 'bg-primary text-white',
  secondary: 'bg-chip text-fg',
};

export const Button: FC<ButtonProps> = ({ theme = 'primary', loading = false, children }) => {
  return (
    <button className={cn('rounded-control px-6 py-3', THEME_CLASS_NAME[theme])} disabled={loading}>
      {children}
    </button>
  );
};
```

- Arrow function, `FC<XProps>`, `type XProps` (not `interface`), props destructured in the signature.
- Variants are a `Record<Theme, string>` lookup, never a `switch`. Compose classes with `cn(...)` (`classnames` + `tailwind-merge`, in `utilities/cn`).
- Tailwind by default; colors and spacing come from theme tokens as CSS variables (`bg-(--bg-primary)`) or semantic classes, not raw hex.
- File-private components get an underscore: `_Input`, `_Error`.
- Compound components for families with shared state: export an object, `export const Modal = { Header, Content, Footer, useModal }`.
- Use only when the component needs it: context provider for shared UI state (modals, sidebars), `useReducer` for complex state, render props for components that expose internal state, portals for overlays, `Suspense` with a skeleton fallback around data fetches.
- `data-testid` on elements a test queries.
- Pages: `const DashboardPage = ...; export default DashboardPage;`.

## Server and client

- Default to Server Components. `"use client"` only for hooks, state, effects, browser APIs or client-only libraries; push it down to the smallest leaf.
- Server-only modules (db, auth, services) start with `import 'server-only'`.
- Server actions: `'use server'` at the top, one action per file in `_actions/` (route-local) or `features/<x>/actions/`, named verb-noun in kebab-case (`update-page-schema.tsx`). Always wrapped in `withProtectedAction` (SKILL.md rule 6).
- Call actions in `startTransition`, branch on `result.failure`, show `failure.message`:

```tsx
const [isPending, startTransition] = useTransition();

const onSubmit = (data: FormShape) => {
  startTransition(async () => {
    const result = await createProject(data);

    if (result.failure) {
      toast.error(result.failure.message);

      return;
    }

    router.push(Path.Projects);
  });
};
```

- Form types are named `XShape` and come from the same schema the action validates with.

## Route handlers and params

- Validate input first with `zod` (`safeParse`), then auth, then work.
- Expected failures: `NextResponse.json({ error: 'Page not found' }, { status: 404 })`. Unexpected: log with context, answer a generic 500.
- `params` and `searchParams` are Promises: `const { slug } = await params`.
- Rate limiting and session-cookie redirects run first in `proxy.ts`.

## Caching

After a mutation, revalidate next to it: `revalidatePath(path)` for routes, `revalidateTag(tag, 'max')` for tagged fetches. Build paths from the `Path` enum and URL composer, never string literals.

## UI defaults

Skeleton loading states for content, large hit targets, short URL slugs without IDs, no product tours, active-voice copy with short sentences, destructive actions get an honest one-click cancel.

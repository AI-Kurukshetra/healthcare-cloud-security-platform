import Link from "next/link";

export const metadata = {
  title: "Healthcare Project",
  description: "Project scaffold and route index.",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
            Platform Scaffold
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground md:text-6xl">
            A healthcare product foundation aligned with the repository contract.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            This baseline includes public auth routes, protected dashboard routing, Supabase SSR helpers,
            validation, and test configuration so feature work can start on stable ground.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              href="/login"
            >
              Open auth routes
            </Link>
            <Link
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-card-foreground transition hover:bg-muted"
              href="/dashboard"
            >
              Open protected dashboard
            </Link>
          </div>
        </section>
        <section className="rounded-[2rem] border border-border bg-card/90 p-8 shadow-[0_20px_80px_rgba(16,57,61,0.12)] backdrop-blur">
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold">Included baseline</h2>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>Next.js 15 App Router with strict TypeScript.</li>
              <li>Tailwind v3 theming with CSS variables.</li>
              <li>Supabase client, server, and middleware helpers.</li>
              <li>Zod validation and React Hook Form wiring.</li>
              <li>TanStack Query, Vitest, and Playwright config.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

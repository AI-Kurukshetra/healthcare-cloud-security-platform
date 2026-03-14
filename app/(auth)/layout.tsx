type AuthLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <div className="grid w-full gap-10 rounded-[2rem] border border-border bg-card/85 p-6 shadow-[0_20px_80px_rgba(16,57,61,0.12)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <section className="flex flex-col justify-between rounded-[1.5rem] bg-primary px-8 py-10 text-primary-foreground">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-primary-foreground/70">Care Platform</p>
            <h1 className="text-4xl font-semibold tracking-tight">Secure access for care teams and patients.</h1>
          </div>
          <p className="max-w-md text-sm leading-7 text-primary-foreground/80">
            Auth pages are ready for Supabase integration. Replace placeholders with real workflows once the MVP
            is defined in the PRD.
          </p>
        </section>
        <section>{children}</section>
      </div>
    </div>
  );
}

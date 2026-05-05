import { Link } from 'react-router-dom'

function LegalPageLayout({ title, children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--brand-border)] bg-white/90">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-6">
          <Link
            to="/"
            className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[var(--brand-deep)]"
          >
            DualPOS
          </Link>
          <Link
            to="/"
            className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-deep)]"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-12 md:px-6">
        <article className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 shadow-[0_10px_32px_rgba(13,31,26,0.08)] md:p-10">
          <h1 className="text-3xl font-bold text-[var(--text-main)] md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
            Last updated: May 5, 2026
          </p>
          <div className="mt-8 space-y-7 text-base leading-8 text-[var(--text-muted)]">
            {children}
          </div>
        </article>
      </main>
    </div>
  )
}

export default LegalPageLayout

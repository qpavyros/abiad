import { Link } from 'react-router-dom'

const featureItems = [
  {
    title: 'Dual-Currency Support',
    description:
      'Instant bill calculations in USD and local currency with automatic exchange-rate handling.',
  },
  {
    title: '100% Offline Capable',
    description:
      'Runs fully in the browser and stores transactions locally, so your shop keeps selling with no internet.',
  },
  {
    title: 'Advanced Shift Management',
    description:
      'Track cashier shifts, log cash expenses, and generate accounting-grade Z-Reports with audit signatures.',
  },
  {
    title: 'Predictive Inventory',
    description:
      'Smart forecasting highlights low-stock products before they run out and helps prevent missed sales.',
  },
  {
    title: 'Role-Based Security',
    description:
      'Separate Cashier, Admin, and Owner access with PIN protection to reduce fraud and unauthorized changes.',
  },
]

const pricingItems = [
  'One-time payment',
  'Full offline POS',
  'Free minor updates',
  'Standard support',
]

function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--brand-border)] bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-5 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <a
              href="#top"
              className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[var(--brand-deep)]"
            >
              DualPOS
            </a>

            <a
              href="#pricing"
              className="rounded-full bg-[var(--brand-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Buy License
            </a>
          </div>

          <nav className="mt-3 flex items-center justify-center gap-6 text-xs font-semibold text-[var(--text-muted)] sm:text-sm md:mt-2 md:justify-start">
            <a href="#features" className="transition hover:text-[var(--brand-deep)]">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-[var(--brand-deep)]">
              Pricing
            </a>
            <a href="#contact" className="transition hover:text-[var(--brand-deep)]">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-14 pt-14 md:grid-cols-2 md:px-6 md:pt-18">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-[#f2d1aa] bg-[#fff4e8] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#9f5e15]">
              Offline-First POS
            </span>

            <h1 className="text-4xl font-bold leading-tight text-[var(--text-main)] md:text-5xl">
              The Ultimate Offline-First POS for Dual-Currency Businesses.
            </h1>

            <p className="max-w-xl text-base leading-8 text-[var(--text-muted)] md:text-lg">
              Manage sales in USD and LBP seamlessly. Track inventory, manage shifts, and
              record expenses without needing an active internet connection.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#pricing"
                className="rounded-full bg-[var(--brand-deep)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                View Pricing
              </a>
              <a
                href="#features"
                className="rounded-full border border-[var(--brand-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-deep)] transition hover:bg-[#f2f8f5]"
              >
                Explore Features
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-4 shadow-[0_14px_50px_rgba(15,61,52,0.12)]">
            <img
              src="/dualpos-dashboard.png"
              alt="DualPOS cashier and analytics dashboard screenshot"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-5 py-16 md:px-6">
          <div className="mb-10 max-w-3xl">
            <h2 className="text-3xl font-bold text-[var(--text-main)] md:text-4xl">
              Features built for real retail pressure
            </h2>
            <p className="mt-4 text-base leading-8 text-[var(--text-muted)] md:text-lg">
              Everything below is production-focused: speed at checkout, traceable accounting,
              and reliable operation when the internet is unstable.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureItems.map((feature, index) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-[var(--brand-border)] bg-white p-6 shadow-[0_8px_28px_rgba(13,31,26,0.08)]"
              >
                <span className="inline-flex rounded-full bg-[#f2f8f5] px-3 py-1 text-xs font-bold tracking-wide text-[var(--brand-deep)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-6xl px-5 py-16 md:px-6">
          <div className="rounded-3xl border border-[var(--brand-border)] bg-[#0f3d34] p-8 text-white shadow-[0_18px_50px_rgba(15,61,52,0.32)] md:p-10">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold md:text-4xl">Simple pricing. No subscriptions.</h2>
              <p className="mt-3 text-base leading-8 text-[#d8e4dd]">
                Paddle reviewers and customers both need clarity. This plan is intentionally
                transparent and easy to buy.
              </p>
            </div>

            <div className="mt-8 max-w-xl rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#f6c587]">
                Lifetime License
              </p>
              <p className="mt-4 text-5xl font-bold">
                $99
                <span className="ml-2 text-sm font-medium text-[#d8e4dd]">one-time payment</span>
              </p>

              <ul className="mt-6 space-y-2 text-sm text-[#e6eeea]">
                {pricingItems.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>

              <a
                href="#"
                className="mt-6 inline-flex rounded-full bg-[var(--brand-highlight)] px-6 py-3 text-sm font-bold text-[#3f2606] transition hover:brightness-105"
              >
                Buy License
              </a>
              <p className="mt-3 text-xs text-[#d8e4dd]">
                Checkout button placeholder for Paddle overlay integration.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto w-full max-w-6xl px-5 py-16 md:px-6">
          <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-8 md:p-10">
            <h2 className="text-3xl font-bold text-[var(--text-main)] md:text-4xl">
              Need help before purchase?
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--text-muted)]">
              Contact us for setup guidance, deployment tips, or Paddle billing questions.
            </p>
            <a
              href="mailto:support@yourdomain.com"
              className="mt-5 inline-flex rounded-full bg-[var(--brand-deep)] px-6 py-3 text-sm font-semibold text-white"
            >
              support@yourdomain.com
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--brand-border)] bg-white/90">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[var(--text-muted)] md:flex-row md:items-center md:justify-between md:px-6">
          <p className="font-semibold text-[var(--brand-deep)]">DualPOS</p>

          <div className="flex flex-wrap items-center gap-5">
            <Link to="/terms" className="hover:text-[var(--brand-deep)]">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-[var(--brand-deep)]">
              Privacy Policy
            </Link>
            <Link to="/refund" className="hover:text-[var(--brand-deep)]">
              Refund Policy
            </Link>
          </div>

          <a href="mailto:support@yourdomain.com" className="font-semibold hover:underline">
            support@yourdomain.com
          </a>
        </div>
      </footer>
    </div>
  )
}

export default HomePage

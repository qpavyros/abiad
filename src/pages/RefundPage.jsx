import LegalPageLayout from './LegalPageLayout'

function RefundPage() {
  return (
    <LegalPageLayout title="Refund Policy">
      <p>
        We want your purchase decision to be low risk and transparent.
      </p>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">1. 14-Day Refund Window</h2>
        <p>
          You are eligible for a full refund within 14 calendar days from the
          original purchase date if the software is not compatible with your
          expectations or workflow.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">2. License Deactivation</h2>
        <p>
          Approval of a refund is subject to deactivation of the purchased
          license and termination of active commercial use of that license.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">3. How to Request</h2>
        <p>
          Send your request to{' '}
          <a href="mailto:support@abiad.systems" className="font-semibold underline">
            support@abiad.systems
          </a>{' '}
          with your order reference and a short reason for the refund request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">4. Processing Time</h2>
        <p>
          Once approved, refunds are initiated through Paddle. Final settlement
          timing depends on your payment provider, usually within 5 to 10
          business days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">5. After 14 Days</h2>
        <p>
          Requests submitted after the 14-day window are generally not eligible
          for refund, except where consumer protection law requires otherwise.
        </p>
      </section>
    </LegalPageLayout>
  )
}

export default RefundPage

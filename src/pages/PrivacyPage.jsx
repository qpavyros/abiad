import LegalPageLayout from './LegalPageLayout'
import SeoMeta from '../components/SeoMeta'

function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <SeoMeta
        title="Privacy Policy | DualPOS"
        description="Understand how DualPOS handles privacy with offline-first local data storage and minimal data collection."
        path="/privacy"
      />

      <p>
        This Privacy Policy explains how DualPOS handles user information.
      </p>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">1. Core Principle</h2>
        <p>
          DualPOS is designed as an offline-first local application. Sales,
          inventory, and customer operation data are processed and stored on
          your own device.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">2. Data We Do Not Collect</h2>
        <p>
          We do not automatically collect or upload your sales records, order
          history, customer details, or inventory data to our servers during
          normal offline use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">3. Local Storage</h2>
        <p>
          Business data remains in local browser storage controlled by you.
          Deleting browser data or changing devices may remove this information
          unless you maintain backups.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">4. Payments</h2>
        <p>
          Purchase transactions are handled by Paddle as merchant of record.
          Billing and payment information is processed by Paddle under their own
          privacy policies and legal terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">5. Contact</h2>
        <p>
          For any privacy requests, contact{' '}
          <a href="mailto:support@abiad.systems" className="font-semibold underline">
            support@abiad.systems
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  )
}

export default PrivacyPage

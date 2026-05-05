import LegalPageLayout from './LegalPageLayout'

function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p>
        These Terms of Service govern your purchase and use of DualPOS. By
        purchasing or using the software, you agree to the terms below.
      </p>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">1. License and Intended Use</h2>
        <p>
          DualPOS is sold as a digital software license for business use. A
          valid purchase grants one license for one business entity unless
          otherwise agreed in writing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">2. Delivery and Access</h2>
        <p>
          License access is delivered digitally after successful payment. You
          are responsible for keeping your activation details secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">3. Software Condition</h2>
        <p>
          The software is provided on an &quot;as is&quot; and &quot;as available&quot; basis
          without warranties of uninterrupted operation or fitness for every
          business process.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">4. Local Data Responsibility</h2>
        <p>
          DualPOS stores operating data locally in your browser environment.
          If browser storage is cleared, removed, or damaged, data may be lost.
          You are responsible for your backup procedures.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">5. Liability Limitation</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for
          indirect losses, lost profits, lost business opportunities, or data
          loss arising from use of the software.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-[var(--text-main)]">6. Contact</h2>
        <p>
          For support or legal inquiries, contact{' '}
          <a href="mailto:support@yourdomain.com" className="font-semibold underline">
            support@yourdomain.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  )
}

export default TermsPage

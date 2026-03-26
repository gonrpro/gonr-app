export default function TermsPage() {
  return (
    <div className="space-y-6 max-w-prose pb-8">
      <h1 className="text-xl font-bold tracking-tight">Terms of Service</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Last updated: March 2026</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Agreement</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          By using GONR, you agree to these terms. GONR is operated by GONR Labs LLC, Fort Myers, Florida.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Professional Use</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          GONR provides stain removal protocols intended for use by trained textile care professionals. Protocols are reference tools — not guarantees. Always test on an inconspicuous area first. GONR is not responsible for damage resulting from the application of any protocol.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Subscriptions</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Subscriptions are billed monthly. You may cancel at any time. No refunds are issued for partial billing periods. We reserve the right to change pricing with 30 days notice.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Acceptable Use</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          You may not resell, redistribute, or scrape GONR content. You may not use GONR to build competing products. One account per subscriber.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Limitation of Liability</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          GONR Labs LLC is not liable for any direct, indirect, or consequential damages arising from the use of GONR protocols. Use professional judgment at all times.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Governing Law</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          These terms are governed by the laws of the State of Florida.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Questions? Email <a href="mailto:hello@gonr.app" className="underline">hello@gonr.app</a>.
        </p>
      </section>
    </div>
  )
}

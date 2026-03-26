export default function PartnersPage() {
  return (
    <div className="space-y-6 max-w-prose pb-8">
      <h1 className="text-xl font-bold tracking-tight">Brand Partners</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        GONR puts the right product recommendation in front of a professional cleaner at the exact moment they need it.
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Who We Reach</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          GONR is used by dry cleaners, spotters, and textile care professionals across the US. These are the people buying your products — not consumers browsing Amazon. When a cleaner asks GONR how to treat a stain, they see the exact agents and products that solve it.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Partnership Opportunities</h2>
        <ul className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
          <li>✓ Featured product recommendations in protocol cards</li>
          <li>✓ Company profile in the Chemical Reference directory</li>
          <li>✓ Agent-to-brand mapping in the Spotter reference tools</li>
          <li>✓ Co-branded educational content</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Get in Touch</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          We're selective about brand partners. If your products belong on a professional spotting board, we want to talk.
        </p>
        <a
          href="mailto:partners@gonr.app"
          className="inline-block text-sm font-semibold px-4 py-2 rounded-lg"
          style={{ background: 'var(--green)', color: '#000', borderRadius: '8px' }}
        >
          Contact Us → partners@gonr.app
        </a>
      </section>

      <p className="text-xs pt-4" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
        GONR Labs LLC · Fort Myers, FL · hello@gonr.app
      </p>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="space-y-6 max-w-prose pb-8">
      <h1 className="text-xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Last updated: March 2026</p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Who We Are</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          GONR is operated by GONR Labs LLC, a Florida limited liability company. We build AI-powered stain removal tools for textile care professionals.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">What We Collect</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          We collect your email address when you create an account. We log stain queries (stain type, surface, sector) to improve protocol accuracy. Photos submitted for stain scanning are processed by OpenAI and are not stored by GONR. We do not sell your data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">How We Use It</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Your email is used for account authentication and product updates. Query logs are used to improve the Stain Brain Engine. We do not use your data for advertising.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Third-Party Services</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          We use Supabase for authentication and data storage, OpenAI for AI-powered protocol generation and image analysis, and Vercel for hosting. Each has their own privacy policy.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Your Rights</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          You can request deletion of your account and associated data at any time by emailing hello@gonr.app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Questions? Email us at <a href="mailto:hello@gonr.app" className="underline">hello@gonr.app</a>.
        </p>
      </section>
    </div>
  )
}

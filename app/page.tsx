'use client'

import { FormEvent, useEffect, useState } from 'react'
import SBEditorialHome from './spottingboard/page'

type WaitlistSource = 'hero' | 'footer'

export default function LandingPage() {
  const [isSpottingBoardHost] = useState(() => {
    if (typeof window === 'undefined') return false
    return /(^|\.)spottingboard\.com$/i.test(window.location.hostname)
  })
  const [email, setEmail] = useState('')
  const [footerEmail, setFooterEmail] = useState('')
  const [sending, setSending] = useState<WaitlistSource | null>(null)
  const [sentEmail, setSentEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSpottingBoardHost) return
    document.documentElement.classList.remove('dark')
    document.body.classList.add('gonr-pretreat-active')
    const nav = document.getElementById('pretreat-nav')
    const onScroll = () => {
      if (!nav) return
      nav.classList.toggle('scrolled', window.scrollY > 8)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      document.body.classList.remove('gonr-pretreat-active')
      window.removeEventListener('scroll', onScroll)
    }
  }, [isSpottingBoardHost])

  if (isSpottingBoardHost) return <SpottingBoardDomainHome />

  async function submitWaitlist(event: FormEvent<HTMLFormElement>, source: WaitlistSource) {
    event.preventDefault()
    const value = (source === 'hero' ? email : footerEmail).trim().toLowerCase()
    if (!value) return
    setError('')
    setSending(source)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: value, source }),
      })
      if (!res.ok) throw new Error('Could not join the waitlist. Try again.')
      setSentEmail(value)
      setEmail('')
      setFooterEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the waitlist. Try again.')
    } finally {
      setSending(null)
    }
  }

  return (
    <main className="pretreat-page -mx-4 -mb-4 -mt-2">
      <div className="pretreat-glow" aria-hidden="true" />
      <header className="pretreat-nav" id="pretreat-nav">
        <div className="pretreat-wrap pretreat-nav-inner">
          <a className="pretreat-brand" href="#top" aria-label="GONR home">
            <img src="/assets/gonr-logo.svg" alt="GONR" />
          </a>
          <nav className="pretreat-nav-links" aria-label="Primary">
            <a href="#how">How It Works</a>
            <a href="#kit">Preview</a>
            <a href="#waitlist">Waitlist</a>
          </nav>
          <a className="pretreat-btn pretreat-btn-sm" href="#waitlist">Join the Waitlist</a>
        </div>
      </header>

      <section className="pretreat-wrap pretreat-hero" id="top">
        <div className="pretreat-hero-copy">
          <p className="pretreat-eyebrow"><span /> Coming Soon</p>
          <h1>Stain + Odor<br /><strong>Killer</strong></h1>
          <p className="pretreat-subhead">Single-use pretreat and laundry booster packets for the sweatiest, smelliest, stainiest loads.</p>
          <div className="pretreat-steps-chip">Fold. Snap. Squeeze.</div>

          <WaitlistForm
            id="hero-email"
            value={email}
            source="hero"
            sending={sending === 'hero'}
            onChange={setEmail}
            onSubmit={submitWaitlist}
          />
          <p className="pretreat-micro">Be first to know when we launch. No spam, ever.</p>
          {sentEmail ? <p className="pretreat-success">You're on the list: {sentEmail}</p> : null}
          {error ? <p className="pretreat-error">{error}</p> : null}

          <div className="pretreat-kit-chip">
            <span className="pretreat-icon">G</span>
            <span><b>Single-use pretreat + booster</b><em>Built for activewear, sportswear, workwear, and travel</em></span>
          </div>
        </div>

        <div className="pretreat-hero-art">
          <div className="pretreat-halo" aria-hidden="true" />
          <figure className="pretreat-product-card">
            <picture>
              <source media="(max-width: 960px)" srcSet="/assets/hero-mobile.jpg" />
              <img src="/assets/hero-desktop.jpg" width="1280" height="853" alt="GONR Stain + Odor Killer single-use pretreat and laundry booster packet" />
            </picture>
          </figure>
          <div className="pretreat-float pretreat-float-1"><span /> Odor defense</div>
          <div className="pretreat-float pretreat-float-2"><span /> Travel friendly</div>
        </div>
      </section>

      <section className="pretreat-wrap pretreat-section" id="why">
        <div className="pretreat-split">
          <article className="pretreat-card pretreat-problem">
            <h2>Most people make a stain worse.</h2>
            <p>Rubbing, spreading, pushing it deeper into the fibers, or reaching for heat can set a stain before you ever get to the wash.</p>
            <div className="pretreat-mini-row">
              <Mini label="Rubbing spreads it" />
              <Mini label="Pushes it deeper" />
              <Mini label="Heat sets it" />
              <Mini label="Harder later" />
            </div>
          </article>
          <article className="pretreat-card">
            <h2>GONR keeps it simple.</h2>
            <p>A single-use packet and a clear method, so you can pretreat the spots that need attention or boost the whole load before the wash.</p>
            <div className="pretreat-mini-row three">
              <Mini label="Check the care label" />
              <Mini label="First response rhythm" />
              <Mini label="Use before washing" />
            </div>
          </article>
        </div>
      </section>

      <section className="pretreat-wrap pretreat-section" id="how">
        <p className="pretreat-kicker"><span /> How It Works <span /></p>
        <h2 className="pretreat-center-title">Three steps. One packet.</h2>
        <p className="pretreat-lead">No guesswork in the laundry room or on the road. Just a simple, repeatable format.</p>
        <div className="pretreat-steps">
          <Step number="1" title="Fold" body="Fold the single-use pack at the marked line." />
          <Step number="2" title="Snap" body="Snap it open when the load or spot needs backup." />
          <Step number="3" title="Squeeze" body="Squeeze into the load or onto the spot, then wash." />
        </div>
      </section>

      <section className="pretreat-wrap pretreat-section">
        <div className="pretreat-band">
          <div className="pretreat-photo">
            <img src="/assets/scene-pull.jpg" alt="Pulling a soft wipe from a single-use GONR sachet" loading="lazy" />
          </div>
          <div className="pretreat-copy">
            <h2>Built for the load that needs backup.</h2>
            <p>Sweaty activewear. Sportswear after practice. Workwear that needs help. A single-use packet fits into a gym bag, suitcase, glovebox, or laundry shelf.</p>
            <Tick>Single-use format</Tick>
            <Tick>Pretreat spots or boost the full load</Tick>
            <Tick>Made for hot or cold water</Tick>
          </div>
        </div>
      </section>

      <section className="pretreat-wrap pretreat-section" id="kit">
        <p className="pretreat-kicker"><span /> The Concept <span /></p>
        <h2 className="pretreat-center-title">Directions, safety, and reorder details on pack.</h2>
        <p className="pretreat-lead">The back panel keeps the instructions close, with scan-to-restock ready for repeat loads.</p>
        <div className="pretreat-kit">
          <div className="pretreat-photo">
            <img src="/assets/gonr-packet-back.jpg" alt="Back of GONR single-use pretreat and laundry booster packet with directions and safety details" loading="lazy" />
          </div>
          <div className="pretreat-copy">
            <h2>Simple in the moment. Useful before the wash.</h2>
            <p>The launch format is built around a packet people can understand fast: into the load, or onto the spot before washing.</p>
            <div className="pretreat-includes">
              <span>Load-ready</span>
              <span>Spot-ready</span>
              <span>Travel-ready</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pretreat-wrap pretreat-section" id="waitlist">
        <div className="pretreat-cta">
          <h2>Be first in line when GONR launches.</h2>
          <p>Join the waitlist for launch updates and early access to GONR Stain + Odor Killer.</p>
          <WaitlistForm
            id="footer-email"
            value={footerEmail}
            source="footer"
            sending={sending === 'footer'}
            onChange={setFooterEmail}
            onSubmit={submitWaitlist}
            lightButton
          />
        </div>
      </section>

      <footer className="pretreat-footer">
        <div className="pretreat-wrap">
          <div className="pretreat-foot-badges">
            <span>Check the Care Label</span>
            <span>Fresh-Spill First Move</span>
            <span>Use Before Washing</span>
          </div>
          <div className="pretreat-foot-base">
            <img src="/assets/gonr-logo.svg" alt="GONR" />
            <span>&copy; 2026 GONR Labs. Coming soon.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function WaitlistForm({
  id,
  value,
  source,
  sending,
  onChange,
  onSubmit,
  lightButton = false,
}: {
  id: string
  value: string
  source: WaitlistSource
  sending: boolean
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>, source: WaitlistSource) => void
  lightButton?: boolean
}) {
  return (
    <form className="pretreat-email-form" onSubmit={(event) => onSubmit(event, source)}>
      <input type="hidden" name="source" value={source} />
      <label className="pretreat-email-label" htmlFor={id}>
        <span aria-hidden="true">@</span>
        <span className="sr-only">Email address</span>
        <input
          id={id}
          type="email"
          name="email"
          placeholder="Enter your email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete="email"
          disabled={sending}
        />
      </label>
      <button className={lightButton ? 'pretreat-btn pretreat-btn-ghost' : 'pretreat-btn'} type="submit" disabled={sending || !value.trim()}>
        {sending ? 'Joining...' : 'Join the Waitlist'}
      </button>
    </form>
  )
}

function Mini({ label }: { label: string }) {
  return <div className="pretreat-mini"><span /> <b>{label}</b></div>
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <article className="pretreat-step">
      <div>{number}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

function Tick({ children }: { children: React.ReactNode }) {
  return <div className="pretreat-tick"><span /> {children}</div>
}

function SpottingBoardDomainHome() {
  return <SBEditorialHome />
}

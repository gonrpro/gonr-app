import { BookOpenCheck, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'GONR is coming soon',
  description: 'GONR is rebuilding around safety-checked, source-grounded stain guidance.',
}

export default function ComingSoonPage() {
  return (
    <main className="fixed inset-0 z-[200] overflow-y-auto bg-[#05070b] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between">
          <div
            className="select-none"
            style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}
          >
            <span>GON</span>
            <span style={{ color: 'var(--brand-green)' }}>R</span>
            <span
              aria-hidden="true"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                verticalAlign: 'super',
                marginLeft: '1px',
                letterSpacing: 0,
                opacity: 0.6,
              }}
            >
              TM
            </span>
          </div>
          <span className="rounded-full border border-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
            Coming soon
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-14">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <ShieldCheck size={26} strokeWidth={1.8} />
          </div>

          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300/75">
            Safety rebuild in progress
          </p>

          <h1 className="max-w-2xl text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl">
            GONR is being rebuilt before it goes live.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
            We found legacy stain cards that do not meet the new safety standard. The public app is paused while GONR moves to a source-grounded Stain Brain model.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white/8 text-white/80">
                <BookOpenCheck size={20} strokeWidth={1.8} />
              </div>
              <h2 className="text-sm font-bold text-white">New source model</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                The next version is based on locator-hardened, safety-gated stain entries.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white/8 text-white/80">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </div>
              <h2 className="text-sm font-bold text-white">Consumer surface paused</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Public stain guidance stays offline until the old card library is safely rewritten.
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-5 text-xs leading-5 text-white/42">
          Professional review is underway. GONR will return when the public guidance is ready.
        </footer>
      </div>
    </main>
  )
}

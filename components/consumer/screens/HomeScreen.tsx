import Link from 'next/link'
import {
  Settings,
  ScanLine,
  Coffee,
  Wine,
  Droplet,
  Leaf,
  ChevronRight,
  Home,
  Clock,
  Heart,
  User,
} from 'lucide-react'

// TASK-218 — mockup-faithful GONR consumer home / scan-entry screen.
// Brand: pink/magenta/orange/navy, GREEN-FREE. Visual shell only — no verdict or
// treatment language here (that lives behind the engine on the result screen).
// "Scan a stain" is an entry CTA into context intake, not a camera-certainty promise.

const POPULAR = [
  { label: 'Coffee', Icon: Coffee },
  { label: 'Red Wine', Icon: Wine },
  { label: 'Grease', Icon: Droplet },
  { label: 'Grass', Icon: Leaf },
] as const

export default function HomeScreen() {
  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col px-5 pb-28 pt-5">
      {/* top bar: wordmark + settings */}
      <div className="flex items-center justify-between">
        <div className="leading-none">
          <span className="gonr-gradient-text text-2xl font-black tracking-tight">GONR</span>
          <span className="ml-2 text-[10px] font-extrabold tracking-[0.22em] text-gonr-textgray">
            STAIN SOLUTIONS
          </span>
        </div>
        <Link href="/solve-v2/settings" aria-label="Settings" className="text-gonr-navy/60">
          <Settings size={22} />
        </Link>
      </div>

      {/* question-first greeting */}
      <div className="mt-7">
        <p className="text-base font-bold text-gonr-textgray">Good morning!</p>
        <h1 className="mt-1 text-3xl font-black leading-tight text-gonr-navy">
          What stain can
          <br />
          we help with?
        </h1>
      </div>

      {/* scan-a-stain CTA */}
      <Link
        href="/solve-v2/solve"
        className="gonr-card mt-6 flex items-center justify-between gap-4 p-4"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
            <ScanLine size={24} />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold text-gonr-navy">Scan a stain</span>
            <span className="text-sm text-gonr-textgray">Get a guided first read in seconds</span>
          </span>
        </span>
        <span className="gonr-gradient grid h-10 w-10 place-items-center rounded-full text-white shadow-lg">
          <ChevronRight size={20} />
        </span>
      </Link>

      {/* popular right now */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-gonr-textgray">
          Popular right now
        </h2>
        <Link href="/solve-v2/solve" className="text-sm font-bold text-gonr-hotpink">
          View all
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {POPULAR.map(({ label, Icon }) => (
          <Link
            key={label}
            href={`/solve-v2/solve?stain=${encodeURIComponent(label.toLowerCase())}`}
            className="gonr-card flex flex-col items-center gap-2 py-3"
          >
            <Icon size={22} className="text-gonr-hotpink" />
            <span className="text-xs font-bold text-gonr-navy">{label}</span>
          </Link>
        ))}
      </div>

      {/* recommended for you */}
      <div className="mt-7">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-gonr-textgray">
          Recommended for you
        </h2>
        <Link
          href="/solve-v2/solve?stain=coffee"
          className="gonr-card mt-3 flex items-center justify-between gap-3 p-3"
        >
          <span className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gonr-softpink text-gonr-hotpink">
              <Coffee size={22} />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-extrabold text-gonr-navy">Coffee on Cotton</span>
              <span className="text-xs text-gonr-textgray">A common one — start here</span>
            </span>
          </span>
          <ChevronRight size={20} className="text-gonr-navy/40" />
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}

function BottomNav() {
  const items = [
    { label: 'Home', Icon: Home, href: '/solve-v2', active: true },
    { label: 'History', Icon: Clock, href: '/solve-v2/history', active: false },
    { label: 'Favorites', Icon: Heart, href: '/solve-v2/favorites', active: false },
    { label: 'Profile', Icon: User, href: '/solve-v2/profile', active: false },
  ] as const
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-[var(--gonr-border)] bg-white/95 backdrop-blur">
      <div className="relative grid grid-cols-4 px-2 py-2">
        {items.map(({ label, Icon, href, active }) => (
          <Link
            key={label}
            href={href}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-bold ${
              active ? 'text-gonr-hotpink' : 'text-gonr-navy/50'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
        {/* center scan FAB */}
        <Link
          href="/solve-v2/solve"
          aria-label="Scan a stain"
          className="gonr-gradient absolute -top-5 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-white shadow-xl ring-4 ring-white"
        >
          <ScanLine size={24} />
        </Link>
      </div>
    </nav>
  )
}

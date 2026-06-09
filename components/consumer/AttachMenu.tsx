'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  ImageIcon,
  ScanLine,
  SprayCan,
  Mic,
  X,
  ChevronRight,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'

// TASK-218 — Screen 2: ATTACH MENU (net-new).
//
// A premium bottom action-sheet titled "What's going on?" that gives the user the
// fastest safe on-ramps into an answer. Photo capture runs through the live vision
// endpoints (/api/scan-stain, /api/scan-label) and carries the result into Chat as
// PRE-FILLED CONTEXT — a HINT, never a verdict (the GONR safety engine still makes
// the final call on the next screen). Brand: pink/magenta/orange/navy, green-free,
// Nunito Sans rounded weight. Render-only: this component authors NO stain advice,
// NO prohibitions, NO product claims — it only routes captured facts forward.
//
// DEPENDENCIES flagged to Atlas (no backing endpoint yet):
//   • "Add Product Label"  — screen 14 is BLOCKED on a sourced product-data feed +
//     SB/Tyler review. Degrades to the chat path, never a dead tap.
//   • "Voice Note"         — no speech endpoint; falls back to typed text per spec.
// Both degrade gracefully into the chat intake instead of failing silently.
//
// HANDOFF CONTRACT: the captured hint is written to sessionStorage under
// ATTACH_CONTEXT_KEY and the user is routed to the chat/intake route. The Chat
// screen (screen 3) reads + clears this key and renders it as a confirmable
// "looks like…" chip. A parent may instead pass `onContext` to own the handoff.

/** sessionStorage key the Chat/intake screen reads to pre-fill captured context. */
export const ATTACH_CONTEXT_KEY = 'gonr:attach-context'

/** Route the captured hint is carried into (chat / clarifying intake). */
const INTAKE_ROUTE = '/solve-v2/solve'

export type AttachVisionSource = 'stain-photo' | 'care-label'

/** Which view the sheet opens to. A non-`menu` value immediately fires the matching
 *  native capture so a Home entry tile feels native (no extra tap inside the sheet).
 *  Cancelling the picker simply lands on the full menu — never a dead end. */
export type AttachInitialAction = 'menu' | 'take-photo' | 'choose-photo' | 'care-label'

/** Stain-photo hint from POST /api/scan-stain (StainIdentification). HINT only. */
export interface AttachStainHint {
  stain: string
  surface: string
  family: string
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

/** Care-label hint from POST /api/scan-label (CareLabelData). Flags = hard constraints. */
export interface AttachCareHint {
  fiber: string
  careSymbols: string[]
  warnings: string[]
  confidence?: string
}

/** The pre-filled context carried into Chat. A starting point, never an answer. */
export interface AttachContext {
  source: AttachVisionSource
  capturedAt: string
  stain?: AttachStainHint
  care?: AttachCareHint
  /** Object URL for the captured photo, shown back as "what you showed me".
   *  An object URL (not base64) so the one-shot sessionStorage handoff stays tiny;
   *  the consumer (SolveFlow) revokes it on unmount. Survives client-side nav since
   *  it lives in the same document. */
  thumbnailUrl?: string
}

export interface AttachMenuProps {
  open: boolean
  onClose: () => void
  /** Override the default sessionStorage + route handoff (e.g. for an in-page flow). */
  onContext?: (ctx: AttachContext) => void
  /** Open the sheet straight to a capture (Home tile → native camera/picker). Default `menu`. */
  initialAction?: AttachInitialAction
}

type SheetView = 'menu' | 'scanning' | 'error'

type ScanKind = 'stain' | 'care'

/** Which not-yet-wired feature the user tapped, so we can degrade honestly. */
type Unavailable = {
  title: string
  body: string
  cta: string
}

const EXIT_MS = 240

export default function AttachMenu({
  open,
  onClose,
  onContext,
  initialAction = 'menu',
}: AttachMenuProps) {
  const router = useRouter()

  // Two-phase mount so the sheet can animate in AND out without a transition lib.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  const [view, setView] = useState<SheetView>('menu')
  const [scanKind, setScanKind] = useState<ScanKind>('stain')
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null)

  const takePhotoRef = useRef<HTMLInputElement>(null)
  const choosePhotoRef = useRef<HTMLInputElement>(null)
  const careLabelRef = useRef<HTMLInputElement>(null)
  // Fire an auto-launch capture at most once per open.
  const launchedRef = useRef(false)

  // Mount on open; defer unmount until the exit transition finishes.
  useEffect(() => {
    if (open) {
      setMounted(true)
      setView('menu')
      setUnavailable(null)
      launchedRef.current = false
      return
    }
    if (!mounted) return
    setShown(false)
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  // Flip to the visible (translated-up) state one frame after mounting.
  useEffect(() => {
    if (!mounted) return
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [mounted])

  // One-tap native entry: when opened to a non-`menu` action, fire the matching
  // capture once the sheet is shown. Cancelling lands on the full menu (no dead end).
  useEffect(() => {
    if (!mounted || !shown || view !== 'menu' || initialAction === 'menu' || launchedRef.current) return
    launchedRef.current = true
    const ref =
      initialAction === 'care-label'
        ? careLabelRef
        : initialAction === 'choose-photo'
          ? choosePhotoRef
          : takePhotoRef
    ref.current?.click()
  }, [mounted, shown, view, initialAction])

  // Lock body scroll + close on Escape while the sheet is up.
  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mounted, onClose])

  function carryContext(ctx: AttachContext) {
    if (onContext) {
      onContext(ctx)
    } else {
      try {
        sessionStorage.setItem(ATTACH_CONTEXT_KEY, JSON.stringify(ctx))
      } catch {
        // sessionStorage unavailable (private mode / sandboxed) — proceed without
        // pre-fill rather than blocking the user. The chat intake still works.
      }
      router.push(INTAKE_ROUTE)
    }
    onClose()
  }

  async function handleFile(file: File, kind: ScanKind) {
    setScanKind(kind)
    setView('scanning')
    try {
      const base64 = await toBase64(file)
      const endpoint = kind === 'stain' ? '/api/scan-stain' : '/api/scan-label'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      if (!res.ok) throw new Error(`scan failed: ${res.status}`)

      // Keep the captured photo so the next screen can reflect "what you showed me"
      // (object URL, not base64 — see AttachContext.thumbnailUrl). Created only after
      // a successful scan so a failed read doesn't leak a URL.
      const thumbnailUrl = URL.createObjectURL(file)

      // The vision endpoints already return a safe low-confidence shape on their own
      // exceptions, so any 200 is carryable as a hint. Confidence downgrades, never
      // escalates — the engine on the next screen renders the actual recommendation.
      if (kind === 'stain') {
        const data = (await res.json()) as AttachStainHint
        carryContext({
          source: 'stain-photo',
          capturedAt: new Date().toISOString(),
          stain: data,
          thumbnailUrl,
        })
      } else {
        const data = (await res.json()) as AttachCareHint
        carryContext({
          source: 'care-label',
          capturedAt: new Date().toISOString(),
          care: data,
          thumbnailUrl,
        })
      }
    } catch {
      // Network / decode failure — never a dead end. Offer retry or the typed path.
      setView('error')
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>, kind: ScanKind) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (file) handleFile(file, kind)
  }

  function goToChat() {
    router.push(INTAKE_ROUTE)
    onClose()
  }

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attach-menu-title"
    >
      {/* Hidden capture inputs. Take Photo opens the rear camera; Choose Photo opens
          the library; Care Label opens the camera and routes to the label reader. */}
      <input
        ref={takePhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e, 'stain')}
      />
      <input
        ref={choosePhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e, 'stain')}
      />
      <input
        ref={careLabelRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPick(e, 'care')}
      />

      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-gonr-navy/35 backdrop-blur-[2px] transition-opacity duration-200 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet */}
      <div
        className={`relative mx-auto w-full max-w-[480px] rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_-20px_rgba(7,27,85,0.45)] transition-transform duration-300 ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* grabber */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gonr-navy/15" aria-hidden="true" />

        {/* header */}
        <div className="flex items-center justify-between">
          <h2 id="attach-menu-title" className="text-xl font-black text-gonr-navy">
            What&rsquo;s going on?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-gonr-lightgray text-gonr-navy/60 transition-colors hover:text-gonr-navy"
          >
            <X size={18} />
          </button>
        </div>

        {view === 'scanning' && <ScanningPanel kind={scanKind} />}

        {view === 'error' && (
          <ErrorPanel
            kind={scanKind}
            onRetry={() => {
              const ref = scanKind === 'care' ? careLabelRef : takePhotoRef
              ref.current?.click()
            }}
            onTypeInstead={goToChat}
          />
        )}

        {view === 'menu' && unavailable && (
          <UnavailablePanel
            feature={unavailable}
            onContinue={goToChat}
            onBack={() => setUnavailable(null)}
          />
        )}

        {view === 'menu' && !unavailable && (
          <div className="mt-4 flex flex-col gap-2.5">
            <MenuRow
              Icon={Camera}
              title="Take Photo"
              sub="Use your camera"
              onClick={() => takePhotoRef.current?.click()}
            />
            <MenuRow
              Icon={ImageIcon}
              title="Choose Photo"
              sub="From your library"
              onClick={() => choosePhotoRef.current?.click()}
            />

            {/* Safety on-ramp — surfaced prominently, never buried. */}
            <CareLabelRow onClick={() => careLabelRef.current?.click()} />

            <MenuRow
              Icon={SprayCan}
              title="Add Product Label"
              sub="Ingredients & warnings"
              onClick={() =>
                setUnavailable({
                  title: 'Tell GONR about the product',
                  body: "Reading a product label from a photo isn't available yet. Type which product you're using and GONR will factor it in.",
                  cta: 'Describe it in chat',
                })
              }
            />
            <MenuRow
              Icon={Mic}
              title="Voice Note"
              sub="Describe what happened"
              onClick={() =>
                setUnavailable({
                  title: 'Type what happened',
                  body: "Voice capture isn't available yet. Typing what happened works exactly the same.",
                  cta: 'Type it instead',
                })
              }
            />

            <button
              type="button"
              onClick={onClose}
              className="mt-1.5 w-full rounded-2xl bg-gonr-lightgray py-3.5 text-center text-base font-extrabold text-gonr-navy transition-colors hover:bg-gonr-softpink"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Standard action row: icon tile + title/sublabel + chevron. */
function MenuRow({
  Icon,
  title,
  sub,
  onClick,
}: {
  Icon: LucideIcon
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="gonr-card flex w-full items-center gap-3.5 p-3.5 text-left gonr-pressable"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gonr-softpink text-gonr-hotpink">
        <Icon size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-extrabold text-gonr-navy">{title}</span>
        <span className="truncate text-sm text-gonr-textgray">{sub}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-gonr-navy/35" aria-hidden="true" />
    </button>
  )
}

/** Care-label row, elevated with a gradient hairline + a "safety first" tag. */
function CareLabelRow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="gonr-gradient w-full rounded-[22px] p-[1.5px] text-left gonr-pressable"
    >
      <span className="flex w-full items-center gap-3.5 rounded-[20px] bg-white p-3.5">
        <span className="gonr-gradient grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white">
          <ScanLine size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="text-base font-extrabold text-gonr-navy">Scan Care Label</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gonr-softpink px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gonr-hotpink">
              <ShieldCheck size={11} />
              Safety first
            </span>
          </span>
          <span className="truncate text-sm text-gonr-textgray">Read fabric &amp; care info</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-gonr-hotpink" aria-hidden="true" />
      </span>
    </button>
  )
}

/** Calm loading state while a photo is read. No verdict, no certainty promise. */
function ScanningPanel({ kind }: { kind: ScanKind }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="gonr-gradient grid h-14 w-14 place-items-center rounded-full text-white">
        <Loader2 size={26} className="animate-spin" />
      </span>
      <p className="text-base font-extrabold text-gonr-navy">
        {kind === 'care' ? 'Reading the care label…' : 'Reading your photo…'}
      </p>
      <p className="max-w-[18rem] text-sm text-gonr-textgray">
        Getting a first read. You&rsquo;ll confirm the details before any advice.
      </p>
    </div>
  )
}

/** Graceful scan failure — retry or fall back to typing. Never a dead end. */
function ErrorPanel({
  kind,
  onRetry,
  onTypeInstead,
}: {
  kind: ScanKind
  onRetry: () => void
  onTypeInstead: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-gonr-softpink text-gonr-hotpink">
        <AlertTriangle size={26} />
      </span>
      <p className="text-base font-extrabold text-gonr-navy">
        {kind === 'care' ? "Couldn't read that label" : "Couldn't read that photo"}
      </p>
      <p className="max-w-[18rem] text-sm text-gonr-textgray">
        It happens. Try another shot, or just tell GONR what happened.
      </p>
      <div className="mt-2 flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="gonr-gradient w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onTypeInstead}
          className="w-full rounded-2xl bg-gonr-lightgray py-3.5 text-base font-extrabold text-gonr-navy transition-colors hover:bg-gonr-softpink"
        >
          Describe it instead
        </button>
      </div>
    </div>
  )
}

/** Honest degrade for inputs without a backing endpoint — routes to the chat path. */
function UnavailablePanel({
  feature,
  onContinue,
  onBack,
}: {
  feature: Unavailable
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-gonr-softpink text-gonr-hotpink">
        <MessageCircle size={26} />
      </span>
      <p className="text-base font-extrabold text-gonr-navy">{feature.title}</p>
      <p className="max-w-[18rem] text-sm text-gonr-textgray">{feature.body}</p>
      <div className="mt-2 flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onContinue}
          className="gonr-gradient w-full rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg"
        >
          {feature.cta}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-2xl bg-gonr-lightgray py-3.5 text-base font-extrabold text-gonr-navy transition-colors hover:bg-gonr-softpink"
        >
          Back
        </button>
      </div>
    </div>
  )
}

/** Read a File as raw base64 (strip the data-URL prefix the vision lib re-adds). */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result.split(',')[1] ?? '')
      else reject(new Error('Unexpected file read result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

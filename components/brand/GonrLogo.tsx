import Image from 'next/image'

type GonrLogoProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
  /** @deprecated The ™ is baked into the approved asset (Tyler 2026-06-09: "the TM like this one"). Accepted but ignored so existing callers don't break. */
  tmClassName?: string
}

export default function GonrLogo({
  className = '',
  imageClassName = '',
  priority = false,
}: GonrLogoProps) {
  return (
    <span className={`inline-flex shrink-0 select-none items-center ${className}`} aria-label="GONR">
      {/* The approved wordmark — pink→orange gradient + sparkle-O + baked-in ™
          (extracted from Tyler's approved image, transparent). 896×252 intrinsic. */}
      <Image
        src="/brand/gonr-logo.png"
        alt="GONR"
        width={896}
        height={252}
        priority={priority}
        sizes="(max-width: 640px) 120px, 150px"
        className={`block h-auto w-full object-contain ${imageClassName}`}
      />
    </span>
  )
}

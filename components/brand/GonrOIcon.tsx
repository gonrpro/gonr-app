import Image from 'next/image'

type GonrOIconProps = {
  className?: string
}

export default function GonrOIcon({ className = 'h-full w-full' }: GonrOIconProps) {
  return (
    <Image
      src="/brand/gonr-o-icon.png"
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      className={className}
      draggable={false}
      sizes="28px"
    />
  )
}

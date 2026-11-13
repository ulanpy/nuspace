import type { ImgHTMLAttributes } from 'react'

export type StaticImageData = string | { src: string }

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | StaticImageData
  fill?: boolean
}

export default function Image({ src, alt, className, fill = false, ...props }: ImageProps) {
  const resolvedSrc = typeof src === 'string' ? src : src.src
  const fillClassName = fill ? `absolute inset-0 w-full h-full ${className ?? ''}`.trim() : className
  return <img src={resolvedSrc} alt={alt ?? ''} className={fillClassName} {...props} />
}

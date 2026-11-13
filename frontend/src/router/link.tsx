import type { AnchorHTMLAttributes } from 'react'
import { Link as RouterLink } from '@tanstack/react-router'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
}

export default function Link({ href, className, children, ...props }: LinkProps) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    )
  }

  return (
    <RouterLink to={href} className={className} {...props}>
      {children}
    </RouterLink>
  )
}

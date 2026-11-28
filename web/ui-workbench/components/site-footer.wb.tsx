import { FOOTER_LINKS } from "./service-hosts"

/**
 * The foot of every host.
 *
 * Three links and nothing else: About on the left, the two legal routes on the
 * right. The grey band Google's footer has is gone — it shaded a strip of
 * links that is now one line, and the page's own background says the same
 * thing without the seam.
 */
export function SiteFooter() {
  const [about, privacy, terms] = FOOTER_LINKS

  return (
    <footer className="mt-auto border-t bg-background text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-7">
        <a href={about.href} className="hover:text-foreground">
          {about.label}
        </a>

        <div className="ml-auto flex gap-6">
          <a href={privacy.href} className="hover:text-foreground">
            {privacy.label}
          </a>
          <a href={terms.href} className="hover:text-foreground">
            {terms.label}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default function SiteFooterPreview() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <p className="p-4 text-sm text-muted-foreground">
        At the foot of every host.
      </p>
      <SiteFooter />
    </div>
  )
}

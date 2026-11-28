// Stands in for my.nuspace.kz/u/$handle, with $handle substituted as "aigerb".
//
// A rendered page, not an account screen: the compact bar a Page wears, and
// the design below it, drawn by the editor's own renderer. The profile is a
// Page, so it is shown the way a Page is shown.
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"

import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"

import { ME_PROFILE, type ProfileFixture } from "./account.wb.demo"

/**
 * The profile's own design, in the blocks the editor writes.
 *
 * A block's `id` lives inside `props`, not beside `type`. Puck reads it as
 * `props.id` when it builds the layer tree, and a block without one lands in
 * that tree as a null node and takes the whole page down with it.
 */
function designFor(person: ProfileFixture) {
  const about = person.blocks.find(
    (block) => block.kind === "rich-text" && block.heading === "About"
  )
  const links = person.blocks.find((block) => block.kind === "link-tree")

  const content = []

  if (about && about.kind === "rich-text") {
    content.push({
      type: "Heading",
      props: { id: "about", text: about.heading, level: "2", size: 14 },
    })
    content.push({
      type: "RichText",
      props: { id: "about-body", richtext: `<p>${about.body}</p>`, size: 14 },
    })
  }

  if (links && links.kind === "link-tree") {
    content.push({
      type: "Heading",
      props: { id: "links", text: links.heading, level: "2", size: 14 },
    })
    content.push({
      type: "LinkTree",
      props: {
        id: "links-body",
        buttons: links.links.map((link) => ({
          label: link.label,
          href: link.href,
          variant: "primary",
          size: "large",
          icon: "Globe",
          iconPosition: "left",
        })),
      },
    })
  }

  return {
    content,
    root: {
      props: {
        backgroundColor: "#ffffff",
        textColor: "",
        accentColor: "#1d4ed8",
        fontFamily: "Inter",
        borderRadius: "12px",
      },
    },
  }
}

export default function Profile() {
  const person = ME_PROFILE
  const design = designFor(person)
  const initials =
    `${person.name.charAt(0)}${person.surname.charAt(0)}`.toUpperCase()

  return (
    <article>
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar">
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-2 px-3 sm:px-6 md:h-16">
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Back to people"
            render={<a href="?c=people" />}
          >
            <ArrowLeftIcon className="size-5" aria-hidden />
          </Button>

          <div className="aspect-square size-9 shrink-0 overflow-hidden rounded-md bg-page/10 ring-1 ring-border md:size-11">
            <ResilientImage
              src={person.customPicture ?? person.keycloakPicture}
              alt={`${person.name} ${person.surname}`}
              containerClassName="size-full"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-page/15 text-base font-semibold text-page"
                >
                  {initials}
                </span>
              }
            />
          </div>

          <h1 className="min-w-0 truncate text-lg/tight font-semibold tracking-tight">
            {person.name} {person.surname}
          </h1>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon"
              aria-label="Profile settings"
              render={<a href="?c=profile-settings" />}
            >
              <SettingsIcon className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* No width clamp: the page's own design decides how wide it is. */}
      <div>
        <PageRenderer data={design} />
      </div>
    </article>
  )
}

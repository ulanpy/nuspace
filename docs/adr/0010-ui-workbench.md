# ADR 0010: UI Workbench

## Status

Accepted

## Context

Components were developed inside whichever route needed them next, with no
isolated surface to judge them on. The tokens in `src/index.css` are inherited
from the previous app and are routinely bypassed with raw palette classes, so
nothing makes that drift visible.

## Decision

The UI workbench is a standalone Vite app in `web/ui-workbench/`, a sibling of
`src`. It is never part of the application build, so there is no dev gate to
write and nothing to exclude from a production bundle. It reaches the host
project through `ui-workbench.config.ts`, which names the import alias and the
dark class.

A file is a workbench file when it is named `*.wb.tsx` in `components/` or
`pages/`. The suffix is the convention and `import.meta.glob` is the discovery:
fixtures go in a sibling `*.wb.demo.tsx`, which the pattern does not match, so
nothing filters them out afterwards. Each mounts by its default export.
Everything in the folder is scratch, and work leaves by being written fresh in
`src/components/shared/` against its real props.

Tokens are read from the source text of the configured stylesheet, via the
`?raw` suffix. The text carries each declaration's enclosing selector and its
offset in the file, so an edit is a patch at a known offset. Live values come from
`getComputedStyle`, and edits are held in one `<style>` element mounted above the
router, so an edit stays applied on whichever entry you navigate to. The download
is that patch applied to the original, and the count beside the download button is
the number of patches it applies, so the two cannot disagree.

Adding a declaration and striking one out are the stylesheet's own business, done
in the file. The workbench gives a value a new one and reports how many values it
changed, and the file's shape is left to the author who owns it.

The sheet is one page in one column. Sections follow the category and then the
declaring block, because 40 tokens exist in both `:root` and `.dark`. A declaration
that is only an alias of another token is a Tailwind mirror, and it gets one
section at the end. A category nothing in the file belongs to gets no section, and
one that a token declares is enough to have it.

The editor is three lines of a stated height: the name on a line of its own, then
its type, its block and what is connected to it, then the preview and the control.
The height is stated because the frame must not change size as the selection moves
through a sheet whose values differ in shape from one line to the next; a value too
tall for the row scrolls inside it rather than pushing the list down. Below `lg` the
preview and the control stack, since side by side in a narrow window neither is
worth looking at. It is pinned above the list, flush with the header so it does not
move when the page scrolls. The component list is 16rem, collapses from the header,
and below `md` opens as a sheet, which choosing an entry closes. Below 1280 it starts
closed, since open it leaves a column too thin to work in; after that it is the
user's, and a resize never closes it. Its toggle asks the sidebar's provider rather
than keeping its own flag, because below `md` the provider is what opens the sheet.

A token's connections are bounded rather than listed: three links and a count for
the rest. A token read by twenty others would otherwise write a line wider than the
window, and the count is one click from every name it stands for. Below `sm` the
count carries all of them, because on a phone the number is what there is room for.

A token's type is normally read off its value, which is right for a file nobody
has touched. Retyping one offers the question the value cannot answer, because the
type decides which control edits the value: a picker, a slider, a row per family,
a row per part of a shorthand. A type the author picked outranks the one the value
implies. Every type has something to show: a colour as a swatch, a radius as a
corner, a space as its own length on a track, a shadow as a card casting one, a
family as a paragraph set in it. A value with no rendering leaves no box rather
than a box of empty air.

What a component or page uses is docked underneath it, not on the token page. It
comes from a walk of that entry's local import tree, reading each file as text and
collecting `var(--x)` references and Tailwind class names. A class counts only
when the stylesheet declares the theme variable behind it, and each hit is
resolved through the alias chain, so `text-muted-foreground` is reported as
`--muted-foreground`. A value assembled in JavaScript is not seen, and neither is
anything from `node_modules`.

That panel carries more than the entry names. A value is only as good as what it
is built on, so the tokens behind it are listed, and so are the tokens that read
it, or the editor's own links have nowhere to land. Both are the same relation the
token sheet shows, so the panel is grouped the same way, by the same component.
The editor holds the top of the panel and the groups scroll under it. A reference
resolves in the block that asks for it and then in the block the preview is in,
because a link should open the value on screen.

## Consequences

- The workbench needs Vite, shadcn and Tailwind v4. Discovery has no equivalent
  outside Vite.
- A page in `pages/` cannot import from the app's own routes. Those bring a shell
  and a session fetch, so a page builds its own layout.
- Type errors in a workbench file are not caught until Vite's overlay. The real
  file is checked when it is written for real.
- A token override is per session. A reload discards it, and Download is the only
  way to keep one.
- `pnpm build` does not see this folder, and CI has nothing to check.
- Tailwind derives its source base from the Vite root, which is this folder, so
  `src/index.css` carries a `@source` directive naming the app's own tree. Without
  it the workbench renders unstyled: 26 kB of CSS instead of 284 kB. It sits beside
  the `@import "tailwindcss";`, which is where a `@source` is compiled.
- The app's own build does scan this folder, since its root is the app, which adds
  about 450 bytes to the production stylesheet.
- A token's type is kept for the session, since nothing in the file records it. A
  reload forgets it, and Reset discards it.

## Related

- ADR 0004 (frontend conventions)
- ADR 0005 (frontend architecture)
- GLOSSARY.md (UI workbench)

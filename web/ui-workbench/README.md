# UI workbench

A dev-only viewer for a shadcn project's design tokens and components. It runs as
its own Vite app, so it shares your components, stylesheet and node_modules
without joining your build.

## Requirements

A Vite project with shadcn on Tailwind v4, since discovery uses
`import.meta.glob`. The workbench imports the shadcn `sidebar`, `button`,
`input`, `native-select`, `dropdown-menu` and `slider` primitives and nothing
else of yours.

## Install

Copy this folder into the project, next to `src/`:

```
web/
├── src/
└── ui-workbench/
    ├── src/
    │   ├── main.tsx         mounts it and names your token file
    │   ├── workbench.tsx    the shell: rail, header, download
    │   ├── token-sheet.tsx  the sheet, editor and panels
    │   ├── tokens.ts        source-text parser, categories, dependency walk
    │   ├── values.ts        reading and writing a CSS value
    │   └── usage.ts         what a component's import tree uses
    └── components/ + pages/   your scratch
```

Three files to edit, then one command.

`ui-workbench.config.ts` tells the workbench what your project calls things,
and the `tsconfig.json` beside it tells your editor and linter the same thing.
They stay separate because a tsconfig cannot import a runtime object, so a new
project sets the path twice.

```ts
export default {
  alias: { "@": "src" }, // paths relative to the app root
  darkClass: "dark",     // the class your theme toggle adds to <html>
}
```

`src/main.tsx` names your token file, imported twice: once to paint, once as
text to edit.

```tsx
import "@/index.css"
import source from "@/index.css?raw"
```

Your CSS file tells Tailwind where to look. Tailwind's automatic source base
follows the Vite root, which here is this folder, so it would miss every
component the workbench renders. This line goes directly under
`@import "tailwindcss";` and nowhere else:

```css
@source "./**/*.{ts,tsx}";
```

Paths are relative to the file holding the directive, so `./` is your `src/`.
Nothing is needed for this folder's own files: they sit under the Vite root,
which Tailwind scans anyway. Without these three edits the workbench renders
unstyled. On nuspace that was the difference between 26 kB and 284 kB.

```sh
pnpm workbench      # or: npx vite ui-workbench
```

Read the port from the output. It moves when something else has 5173.

## Driving it from a terminal

```sh
node scripts/browser.mjs http://localhost:5173/ 1200 800 out.png check.mjs
```

Starts headless Chrome, runs `check.mjs` against the page if given one, and
exits non-zero if the page logged an error or threw. It exists because a hook
called outside its provider, or any render that throws, leaves a blank page
that types, tests, lint and build all pass.

`check.mjs` is a file rather than an argument, since a script with `//`
comments does not survive being collapsed onto one line. Its return value
prints as JSON, so measure rather than look:

```js
// check.mjs: does this window scroll sideways?
(() => {
  const doc = document.documentElement
  return JSON.stringify({
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
  })
})()
```

## Adding demos

Any `*.wb.tsx` file in `components/` or `pages/` shows up in the sidebar under
its filename. Nothing is registered anywhere.

```tsx
// components/pricing-table.wb.tsx
import { DataTable } from "@/components/shared/data-table/data-table"

export default function PricingTable() {
  return <DataTable data={FIXTURES} columns={COLUMNS} />
}
```

Fixtures go in a sibling `.wb.demo.tsx`. The suffix is the whole mechanism: a
file has to be called `*.wb.tsx` to be an entry, so `.wb.demo.tsx` is skipped
by the same glob and the two can never be confused.

```
components/
├── pricing-table.wb.tsx        the thing you are judging
└── pricing-table.wb.demo.tsx   fixtures, deleted when you are done
```

Pages live in `pages/` and render full-bleed with no heading, so you can judge
one at the width it will run at. A page builds its own layout out of shared
components; your app's own routes bring a shell and a session fetch with them.

## The token sheet

Every custom property in the file, on one page, in one column. Sections follow
the category and the declaring block, so `:root`, `.dark` and `@theme` stay
apart, and a token declared in both `:root` and `.dark` is two rows because
they are two declarations. A value that is only an alias of another token is a
Tailwind mirror and gets its own section at the end. Names carry no `--`.

Values read and write per kind. A colour shows one notation at a time, the one
the file already uses, and the picker writes in whichever notation the field is
set to. A radius and a space are sliders, each on the scale its own kind of
value uses. A duration and a timing function share one text field with a
dropdown of the shapes either can be written in: a named curve, the curve
spelled out, or a duration in `ms` or `s`. Picking one writes that shape with
a value of its own, so `0.18s` and `180ms` are the same duration whichever is
on offer. A font stack is one row per family with its own input plus a button
to add one. An animation shorthand splits the same way into rows named `name`,
`duration` and `easing`. A shadow splits into x, y, blur, spread and colour.

The preview beside each value shows what it looks like: a colour as a swatch
carrying its foreground where the file declares one, a radius as a corner, a
space as its own length on a track so two can be compared by looking, a shadow
as a card casting one, a family as a paragraph set in it, a curve as the curve
itself.

The kind beside the name in the editor is what a token is, which is not always
what its value looks like today. Picking a different one reads the value as
that kind, starting again from that kind's default. It is an unsaved change
like any other, and Reset goes back to the file's value. An alias keeps its
value, because it mirrors whatever it points at. A spacing or shadow token the
file already has gets its own section even when nothing of its kind is
declared.

Whatever a value depends on is stated in the editor. `--radius-sm` is a
calculation of `--radius`, which is an alias of `--radius-panel`, so the chain
is shown and each step is a link. The other direction links too: a token
something else reads names that token, so clicking `--color-background` under
`--background` opens it. A reference is followed in the block the preview is
in, so in dark mode a mirror of `--sidebar-border` opens the dark declaration,
which is the value on screen. `--radius` is read by seven tokens, so three are
links and the rest sit behind a count; below `sm` the count carries all of them.

The editor is three lines of a stated height: the name on a line of its own,
then its kind, its block and what is connected to it, then the preview and the
control. Below `lg` the preview and the control stack. The frame never changes
size as the selection moves; a value too tall for the row, such as a
five-family stack, scrolls inside it. It is pinned to the top of the sheet,
under the header and flush with it, so the list scrolls underneath. The
component list is 16rem and collapses from the header; below `md` it opens as a
sheet that closes when you pick an entry. A window narrower than 1280 starts
with it closed, since open it leaves a column too thin to work in. The header
drops its button labels below `sm` and keeps them on the icons.

`useSidebar()` belongs to a component rendered inside the provider, which is
why `Header` and `SidebarNav` are components and the rest of the shell is not.
Calling it in the component that renders the provider blanks the page, and only
a browser will say so.

Changes follow you: edit `--primary`, open a component, and the component is
painted with it.

**Download** writes a complete CSS file with every changed value applied. The
count on the button is the number of edits that file carries, and you paste it
over the original. **Reset** clears them along with any kind picked in the
session. The browser never writes to disk, so the file stays untouched until
you paste. Adding and removing declarations is the stylesheet's own business: a
token it no longer declares is neither counted nor written.

## What a component is using

Open a component or a page and the tokens it touches are docked underneath it,
with the same editor, so a value can be changed while the component is on
screen.

The list comes from a walk of the component's own import tree: every file it
reaches through a local import, read as text. It collects `var(--x)` references
and Tailwind class names, maps a class to the theme variable behind it, keeps
only names the stylesheet actually declares, and resolves each through the alias
chain, so you get `--muted` rather than `--color-muted`. A value assembled in
JavaScript does not show up, and neither does anything from `node_modules`.

It carries more than what the component names. Everything those values are
built on is there, so `rounded-md` brings `--radius-md`, `--radius` and
`--radius-panel` with it, and everything that reads them is there too, which
gives the editor's links somewhere to land. The result is grouped by category
and by block, like the token sheet, because it is the same list of tokens.

The panel is a fixed share of the window: the editor holds the top of it, the
groups scroll underneath with 16px between them, and the scroll stops at the
end of the list. A page renders full bleed with no padding.

## Getting work out

Everything in here is scratch. The component you keep gets written fresh in
`src/components/shared/`, against its real props, with the fixtures dropped.

## Known limits

- Your production stylesheet grows by about 450 bytes, because Tailwind now
  scans this folder too. Gitignoring `ui-workbench/` removes it.
- The theme toggle does not persist. The workbench flips the root class
  directly and forgets on reload, so match `darkClass` to your app's or the
  preview shows a palette it never paints.
- A picked kind lives in the session. It survives a reload and is discarded by
  Reset. Retyping a token rewrites its value to that kind's default; Reset puts
  the file's value back.
- A declaration can only be given a new value. Adding one and striking one out
  happen in the stylesheet, and the download only writes values.
- No typecheck. A type error surfaces as a Vite overlay while you work. The
  parser, the value helpers and the import walk have tests:
  `pnpm test:workbench`.
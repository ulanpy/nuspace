import { createFileRoute } from "@tanstack/react-router"
import { ExternalLinkIcon, LifeBuoyIcon } from "lucide-react"

import { TEAM, type TeamMember } from "@/features/about/team"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const Route = createFileRoute("/_public/about")({
  component: About,
})

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-6 text-center">
      {member.photo ? (
        <img
          src={member.photo}
          alt=""
          aria-hidden
          loading="lazy"
          className="size-20 rounded-full bg-muted object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-20 place-items-center rounded-full bg-muted text-2xl font-medium text-muted-foreground"
        >
          {member.name.charAt(0)}
        </span>
      )}

      <div className="space-y-0.5">
        <h3 className="font-semibold">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </div>

      {member.links.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {member.links.map((link) => (
            <li key={link.kind}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {/* Named rather than iconified: lucide carries no brand marks,
                    and a name reads correctly to a screen reader anyway. */}
                {link.kind}
                <span className="sr-only"> — {member.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 py-10">
      <header className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          About <span className="text-primary">Nuspace</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Your campus platform for Nazarbayev University
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-8">
        <h2 className="text-2xl font-bold">Mission</h2>
        <p className="leading-relaxed text-muted-foreground">
          Nuspace brings together everything a Nazarbayev University student
          needs: courses, events, contacts, and campus services in one place.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          We build tools that help students make the most of their time at NU —
          track academics, find events worth attending, and reach the right
          office without guessing who to contact.
        </p>
      </section>

      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">The team</h2>
          <p className="text-muted-foreground">
            Nuspace is built and run by students.
          </p>
        </div>
        {/* The old page hid the team behind a modal; there is no reason for a
            static list of names to need a click to read. */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <li key={member.name}>
              <MemberCard member={member} />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-8">
        <div className="flex items-center gap-3">
          <LifeBuoyIcon className="size-6 shrink-0 text-primary" aria-hidden />
          <h2 className="text-2xl font-bold">Need help?</h2>
        </div>
        <p className="text-muted-foreground">
          Found a bug or having issues? Reach out directly for quick assistance.
        </p>
        <Button
          render={
            <a
              href="https://t.me/kamikadze24"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact on Telegram
              <ExternalLinkIcon className="size-4" aria-hidden />
            </a>
          }
        />
      </section>
    </div>
  )
}

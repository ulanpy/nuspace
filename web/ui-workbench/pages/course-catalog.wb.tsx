/**
 * A page renders full-bleed with no heading and no workbench padding, so it can
 * be judged at the viewport it will actually run at.
 *
 * It cannot import from the app's own routes. Those bring a shell and a session
 * fetch this has no business making, so a page builds its own layout from
 * shared components.
 */
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

const COURSES = [
  { code: "MATH 251", name: "Linear Algebra", seats: 12 },
  { code: "ECON 201", name: "Microeconomics", seats: 0 },
  { code: "CS 302", name: "Data Structures", seats: 4 },
  { code: "PHYS 101", name: "Physics I", seats: 18 },
]

export default function CourseCatalog() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <span className="font-heading text-lg font-medium">NU Catalog</span>
          <nav className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span>Courses</span>
            <span>Programs</span>
            <Button size="sm">Sign in</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <section className="space-y-2">
          <h1 className="font-heading text-3xl font-medium">
            Fall 2026 course list
          </h1>
          <p className="text-muted-foreground">
            412 courses open. Enrolment closes Friday at 17:00.
          </p>
        </section>

        <Input className="max-w-sm" placeholder="Search by code or name" />

        <Separator />

        <ul className="grid gap-4 sm:grid-cols-2">
          {COURSES.map((course) => (
            <li key={course.code}>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <div className="space-y-1">
                      <CardTitle>{course.name}</CardTitle>
                      <CardDescription>{course.code}</CardDescription>
                    </div>
                    <Badge variant={course.seats ? "secondary" : "destructive"}>
                      {course.seats ? `${course.seats} seats` : "Full"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm">Enrol</Button>
                  <Button size="sm" variant="outline">
                    Syllabus
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

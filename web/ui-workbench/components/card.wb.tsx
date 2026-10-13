import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function CardDemo() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Degree Audit</CardTitle>
        <CardDescription>Fall 2026</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        42 of 120 credits completed.
      </CardContent>
    </Card>
  )
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AlertDemo() {
  return (
    <div className="space-y-3">
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Registrar opens Monday at 09:00.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>
          Your card was declined. Update it in Account.
        </AlertDescription>
      </Alert>
    </div>
  )
}

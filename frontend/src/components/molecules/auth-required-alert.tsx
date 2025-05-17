import { Alert, AlertTitle, AlertDescription } from "../atoms/alert";
import { Button } from "../atoms/button";
export function AuthRequiredAlert({ onClick }: { onClick: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Authentication Required</AlertTitle>
      <AlertDescription>
        You must be logged in to create a listing.
        <Button variant="link" onClick={onClick}>
          Login
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function TelegramRequiredAlert() {
  return (
    <Alert
      variant="default"
      className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900"
    >
      <AlertTitle className="flex items-center gap-2">
        Telegram Required
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>You need to link your Telegram account before selling items.</p>
      </AlertDescription>
    </Alert>
  );
}

import { useEventNotifications } from "@/hooks/use-event-notifications"
import { Switch } from "@/components/ui/switch"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

/**
 * The switch for Telegram notices about events the viewer attends: cancelled,
 * moved to another time, or moved to another place. Without Telegram connected
 * there is nobody to notify, so the switch is off the table and the line says
 * what to do.
 */
export function EventNotificationsItem({
  isTelegramLinked,
}: {
  isTelegramLinked: boolean
}) {
  const notifications = useEventNotifications()

  return (
    <Item variant="muted">
      <ItemContent>
        <ItemTitle id="event-notifications-label">
          Event notifications
        </ItemTitle>
        <ItemDescription>
          {isTelegramLinked
            ? "Get a Telegram message when an event you attend is cancelled or moved."
            : "Connecting Telegram enables notifications when an event you attend is cancelled or moved."}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          aria-labelledby="event-notifications-label"
          checked={notifications.enabled ?? false}
          disabled={
            !isTelegramLinked ||
            notifications.enabled === undefined ||
            notifications.isSaving
          }
          onCheckedChange={notifications.setEnabled}
        />
      </ItemActions>
    </Item>
  )
}

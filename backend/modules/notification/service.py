from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.notification.utils import send
from backend.common.schemas import Infra
from backend.core.database.models.common_enums import EntityType, NotificationType
from backend.core.database.models.sgotinish import Ticket, TicketAccess, Message
from backend.core.database.models.user import User
from backend.modules.notification.schemas import RequestNotiification
from backend.modules.sgotinish.tickets.interfaces import AbstractNotificationService


class NotificationService(AbstractNotificationService):
    def __init__(self, session: AsyncSession, infra: Infra):
        self.session = session
        self.infra = infra

    async def notify_new_ticket_to_bosses(self, ticket: Ticket, bosses: List[User]):
        """Notifies all bosses about a new ticket."""
        notifications_data = [
            RequestNotiification(
                title="You have received a new ticket",
                message=f"Ticket: {ticket.title}",
                notification_source=EntityType.tickets,
                receiver_sub=boss.sub,
                type=NotificationType.info,
                telegram_id=boss.telegram_id,
                url="https://sgotinish.org/tickets",
            )
            for boss in bosses
            if boss.telegram_id
        ]
        if notifications_data:
            await send(
                infra=self.infra,
                notification_data=notifications_data,
                session=self.session,
            )

    async def notify_ticket_access_granted(self, ticket: Ticket, access: TicketAccess):
        """Notifies user about a ticket access granted."""
        notifications_data = [
            RequestNotiification(
                title=f"{access.granter.name} {access.granter.surname} has granted you access to a ticket",
                message=f"Ticket: {ticket.title}\nPermission: {access.permission.value}",
                notification_source=EntityType.tickets,
                receiver_sub=access.user_sub,
                type=NotificationType.info,
                telegram_id=access.user.telegram_id,
                url="https://sgotinish.org/tickets",
            )
        ]
        if notifications_data:
            await send(
                infra=self.infra,
                notification_data=notifications_data,
                session=self.session,
            )

    async def notify_ticket_updated(self, ticket: Ticket):
        """Notifies user about a ticket updated."""
        notifications_data = [
            RequestNotiification(
                title="Your ticket status has been updated",
                message=f"Ticket: {ticket.title}\nStatus: {ticket.status.value}",
                notification_source=EntityType.tickets,
                receiver_sub=ticket.author.sub,
                type=NotificationType.info,
                telegram_id=ticket.author.telegram_id,
                url="https://sgotinish.org/tickets",
            )
        ]
        if notifications_data:
            await send(
                infra=self.infra,
                notification_data=notifications_data,
                session=self.session,
            )

    async def notify_new_message(self, message: Message):
        """Notifies the recipient of a new message."""
        ticket = message.conversation.ticket

        if message.is_from_sg_member:
            sender = message.conversation.sg_member
            recipient = ticket.author
            if not (recipient and recipient.telegram_id and sender):
                return

            sender_name = f"{sender.name} {sender.surname}"
            sender_details = f"{sender.role.value}, {sender.department.name}" if sender.department else sender.role.value
            title = f"New message from {sender_name}"
            message_body = (
                f"Ticket: {ticket.title}\n"
                f"Sender: {sender_name} ({sender_details})\n"
                f"Message: {message.body}"
            )
        else:
            sender = ticket.author
            recipient = message.conversation.sg_member
            if not (recipient and recipient.telegram_id and sender):
                return

            sender_name = f"{sender.name} {sender.surname}"
            title = f"New message from {sender_name}"
            message_body = f"Ticket: {ticket.title}\nMessage: {message.body}"

        notifications_data = [
            RequestNotiification(
                title=title,
                message=message_body,
                notification_source=EntityType.tickets,
                receiver_sub=recipient.sub,
                type=NotificationType.info,
                telegram_id=recipient.telegram_id,
                url=f"https://sgotinish.org/tickets/{ticket.id}",
            )
        ]
        if notifications_data:
            await send(
                infra=self.infra,
                notification_data=notifications_data,
                session=self.session,
            )
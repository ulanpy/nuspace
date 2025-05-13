from backend.core.database.models import Message


def format_history(messages: list[Message]) -> list[dict]:
    return [{"role": message.sender_type.value, "content": message.content} for message in messages]



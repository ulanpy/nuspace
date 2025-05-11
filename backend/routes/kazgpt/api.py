from typing import List, Optional

from openai import AsyncOpenAI

from backend.core.database.models.chat import ModelType


async def ask_gpt(
    client: AsyncOpenAI,
    history: List[dict],
    model: ModelType = ModelType.GPT_3_5,
    system_prompt: Optional[dict] = None,
) -> str:
    response = await client.chat.completions.create(model=model.value, messages=history)
    return response.choices[0].message.content

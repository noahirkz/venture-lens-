import json
import re

from app.core.anthropic import get_async_anthropic

_SYSTEM_PROMPT = """You analyze startup companies for venture capital research.

Respond with ONLY valid JSON — no markdown fences, no explanation, no preamble.

Return exactly this shape:
{
  "name": "canonical company name",
  "one_line_description": "one crisp sentence describing what the company does",
  "problem_solved": "the specific problem this company addresses",
  "target_market": "who the primary customers are",
  "business_model": "how the company generates revenue",
  "competitive_advantage": "what makes them defensible or unique",
  "red_flags": "key risks or concerns (empty string if none)"
}"""


async def summarize_company(name: str, description: str, website: str = "") -> dict:
    client = get_async_anthropic()

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": f"Company: {name}\nWebsite: {website or 'unknown'}\nDescription: {description}",
            }
        ],
    )

    raw = message.content[0].text  # type: ignore[union-attr]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {
            "name": name,
            "one_line_description": description[:200],
            "problem_solved": "",
            "target_market": "",
            "business_model": "",
            "competitive_advantage": "",
            "red_flags": "AI summary unavailable — parse error",
        }

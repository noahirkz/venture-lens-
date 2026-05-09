import json
import re

from app.core.anthropic import get_async_anthropic

# Weights: team 30%, traction 25%, market 20%, funding_velocity 15%, differentiation 10%
_SYSTEM_PROMPT = """You score startups for venture capital investment potential.

Signal weights:
  team              30%  — founder pedigree, domain expertise, repeat founders
  traction          25%  — revenue, growth, user adoption signals
  market            20%  — TAM, timing, macro tailwinds
  funding_velocity  15%  — fundraising speed and backer quality
  differentiation   10%  — unique insight, moat, defensibility

Compute `score` as the weighted average of the five signal scores (each 0–100).

Respond with ONLY valid JSON — no markdown, no explanation.

Return exactly this shape:
{
  "score": <integer 0-100, weighted composite>,
  "signals": {
    "team": <integer 0-100>,
    "traction": <integer 0-100>,
    "market": <integer 0-100>,
    "funding_velocity": <integer 0-100>,
    "differentiation": <integer 0-100>
  },
  "reasoning": "<2-3 sentences explaining the composite score>"
}"""


async def score_company(summary: dict, raw_description: str = "") -> dict:
    client = get_async_anthropic()

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
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
                "content": (
                    f"Company intelligence:\n{json.dumps(summary, indent=2)}"
                    f"\n\nAdditional context:\n{raw_description}"
                ),
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
            "score": 50,
            "signals": {
                "team": 50,
                "traction": 50,
                "market": 50,
                "funding_velocity": 50,
                "differentiation": 50,
            },
            "reasoning": "Scoring unavailable — parse error.",
        }

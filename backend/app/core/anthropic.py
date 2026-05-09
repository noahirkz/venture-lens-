from functools import lru_cache

import anthropic

from app.config import settings


@lru_cache(maxsize=1)
def get_anthropic() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)

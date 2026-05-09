"""
Playwright async scraper for ProductHunt's AI topic page.

Returns a list of dicts: {name, description, source_url, source}.
Run `playwright install chromium` after pip install.
"""

import logging

from playwright.async_api import TimeoutError as PWTimeout
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

_URL = "https://www.producthunt.com/topics/artificial-intelligence"
_TIMEOUT = 30_000  # ms


async def scrape_producthunt() -> list[dict]:
    results: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto(_URL, timeout=_TIMEOUT, wait_until="domcontentloaded")

            # Wait for at least one post link to appear
            await page.wait_for_selector('a[href*="/posts/"]', timeout=_TIMEOUT)

            # Collect all post anchor elements
            anchors = await page.query_selector_all('a[href*="/posts/"]')

            seen: set[str] = set()
            for anchor in anchors:
                try:
                    href = await anchor.get_attribute("href") or ""
                    if not href or href in seen:
                        continue
                    seen.add(href)

                    source_url = (
                        f"https://www.producthunt.com{href}"
                        if href.startswith("/")
                        else href
                    )

                    # Name: text directly inside the anchor, or first heading child
                    name_el = await anchor.query_selector("h3, h2, [class*='name'], [class*='title']")
                    name = (
                        (await name_el.inner_text()).strip()
                        if name_el
                        else (await anchor.inner_text()).strip()
                    )
                    name = name.splitlines()[0].strip()  # first line only

                    # Tagline: sibling or nearby paragraph relative to the anchor's parent
                    parent = await anchor.evaluate_handle("el => el.closest('li, article, [data-test]')")
                    desc = ""
                    if parent:
                        desc_el = await parent.query_selector(
                            "[class*='tagline'], [class*='description'], p"
                        )
                        if desc_el:
                            desc = (await desc_el.inner_text()).strip()

                    if name and len(name) > 1:
                        results.append(
                            {
                                "name": name,
                                "description": desc,
                                "source_url": source_url,
                                "source": "producthunt",
                            }
                        )
                except Exception:
                    continue

        except PWTimeout:
            logger.warning("ProductHunt scrape timed out after %dms", _TIMEOUT)
        except Exception as exc:
            logger.error("ProductHunt scrape error: %s", exc)
        finally:
            await browser.close()

    logger.info("ProductHunt: scraped %d companies", len(results))
    return results

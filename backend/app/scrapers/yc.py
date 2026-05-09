"""
Playwright async scraper for the YC Companies directory.

Returns a list of dicts: {name, description, source_url, source}.
Run `playwright install chromium` after pip install.
"""

import logging

from playwright.async_api import TimeoutError as PWTimeout
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

_URL = "https://www.ycombinator.com/companies"
_TIMEOUT = 30_000  # ms


async def scrape_yc() -> list[dict]:
    results: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto(_URL, timeout=_TIMEOUT, wait_until="domcontentloaded")

            # Wait for company cards
            await page.wait_for_selector(
                "a[href*='/companies/']", timeout=_TIMEOUT
            )

            # Scroll once to trigger lazy loading
            await page.evaluate("window.scrollBy(0, window.innerHeight * 2)")
            await page.wait_for_timeout(1500)

            anchors = await page.query_selector_all("a[href*='/companies/']")

            seen: set[str] = set()
            for anchor in anchors:
                try:
                    href = await anchor.get_attribute("href") or ""
                    # Skip filter/nav links — company pages have a slug after /companies/
                    parts = href.rstrip("/").split("/")
                    if len(parts) < 3 or parts[-1] in ("", "companies"):
                        continue
                    if href in seen:
                        continue
                    seen.add(href)

                    source_url = (
                        f"https://www.ycombinator.com{href}"
                        if href.startswith("/")
                        else href
                    )

                    # Company name
                    name_el = await anchor.query_selector(
                        "[class*='company-name'], [class*='CompanyName'], h4, h3, strong"
                    )
                    name = (
                        (await name_el.inner_text()).strip()
                        if name_el
                        else (await anchor.inner_text()).strip()
                    )
                    name = name.splitlines()[0].strip()

                    # Short blurb
                    desc_el = await anchor.query_selector(
                        "[class*='blurb'], [class*='description'], [class*='tagline'], p, span"
                    )
                    desc = (await desc_el.inner_text()).strip() if desc_el else ""

                    if name and len(name) > 1:
                        results.append(
                            {
                                "name": name,
                                "description": desc,
                                "source_url": source_url,
                                "source": "yc",
                            }
                        )
                except Exception:
                    continue

        except PWTimeout:
            logger.warning("YC scrape timed out after %dms", _TIMEOUT)
        except Exception as exc:
            logger.error("YC scrape error: %s", exc)
        finally:
            await browser.close()

    logger.info("YC: scraped %d companies", len(results))
    return results

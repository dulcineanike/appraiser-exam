import asyncio
import os
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ARTIFACT_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
INDEX_URL = "file:///d:/不動產估價師歷屆考題/web/index.html"

async def test_scrolled_drawer():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 950})

        await page.goto(INDEX_URL)
        await page.wait_for_timeout(1000)

        drawer_btn = page.locator("#searchResultContainer .question-item .btn-q-action").filter(has_text="參考解答").first
        await drawer_btn.click()
        await page.wait_for_timeout(500)

        # Scroll down so both 1.擬答 and 2.參考條文 are visible
        statutes_elem = page.locator("#searchResultContainer .statutes-card").first
        await statutes_elem.scroll_into_view_if_needed()
        await page.wait_for_timeout(300)

        shot = os.path.join(ARTIFACT_DIR, "simplified_ai_drawer_scrolled.png")
        await page.screenshot(path=shot)
        print(f"Captured scrolled drawer to {shot}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(test_scrolled_drawer())

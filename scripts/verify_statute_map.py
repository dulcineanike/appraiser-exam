import asyncio
import os
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ARTIFACT_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
INDEX_URL = "file:///d:/不動產估價師歷屆考題/web/index.html"

async def test_statute_map():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})

        page.on("pageerror", lambda err: print(f"[Browser Page Error]: {err}"))
        page.on("console", lambda msg: print(f"[Console {msg.type}]: {msg.text}"))

        print("Navigating to index.html...")
        await page.goto(INDEX_URL)
        await page.wait_for_timeout(1000)

        print("Clicking '法條考題地圖' tab...")
        statute_tab_btn = page.locator("button[data-tab='statuteMap']")
        await statute_tab_btn.click()
        await page.wait_for_timeout(500)

        banner_text = await page.locator("#statuteMapSummaryBanner").inner_text()
        print(f"Banner snippet: {banner_text[:80]}...")

        overview_shot = os.path.join(ARTIFACT_DIR, "statute_map_overview.png")
        await page.screenshot(path=overview_shot)
        print(f"Captured statute map overview to {overview_shot}")

        print("Testing statute search for '土地開發'...")
        statute_search = page.locator("#statuteSearchInput")
        await statute_search.fill("土地開發")
        await page.wait_for_timeout(400)

        search_shot = os.path.join(ARTIFACT_DIR, "statute_map_search_ldc.png")
        await page.screenshot(path=search_shot)
        print(f"Captured LDC search shot to {search_shot}")

        first_q_btn = page.locator(".statute-card.open .statute-view-btn").first
        if await first_q_btn.count() > 0:
            print("Clicking '查看考題擬答' button...")
            await first_q_btn.click()
            await page.wait_for_timeout(600)

            drawer_shot = os.path.join(ARTIFACT_DIR, "statute_to_answer_jump.png")
            await page.screenshot(path=drawer_shot)
            print(f"Captured jump to answer drawer to {drawer_shot}")

        await browser.close()
        print("All statute map automated tests completed successfully!")

if __name__ == '__main__':
    asyncio.run(test_statute_map())

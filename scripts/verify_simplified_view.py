import asyncio
import os
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ARTIFACT_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
INDEX_URL = "file:///d:/不動產估價師歷屆考題/web/index.html"

async def test_simplified_view():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 950})

        print("Loading index.html...")
        await page.goto(INDEX_URL)
        await page.wait_for_timeout(1000)

        # 1. Verify header title & subtitle
        title_text = await page.locator(".brand-title").inner_text()
        subtitle_text = await page.locator(".brand-subtitle").inner_text()
        icon_count = await page.locator(".brand-icon").count()

        print(f"Header Title: '{title_text}'")
        print(f"Header Subtitle: '{subtitle_text}'")
        print(f"Brand Icon Count: {icon_count}")

        assert title_text.strip() == "不動產估價師歷屆試題", f"Unexpected title: {title_text}"
        assert subtitle_text.strip() == "收錄民國 91～115 年國家考試 638 題", f"Unexpected subtitle: {subtitle_text}"
        assert icon_count == 0, f"Brand icon was not removed! Count = {icon_count}"

        # 2. Take screenshot of Simplified Header & Homepage
        header_shot = os.path.join(ARTIFACT_DIR, "simplified_header_homepage.png")
        await page.screenshot(path=header_shot)
        print(f"Saved simplified header screenshot to {header_shot}")

        # 3. Open the answer drawer on the first question
        drawer_btn = page.locator("#searchResultContainer .question-item .btn-q-action").filter(has_text="參考解答").first
        await drawer_btn.click()
        await page.wait_for_timeout(500)

        # 4. Check that "1. 擬答：" and "2. 參考條文：" are present, and unwanted elements are gone
        drawer = page.locator("#searchResultContainer .answer-drawer").first
        drawer_text = await drawer.inner_text()

        assert "1. 擬答：" in drawer_text, "Missing '1. 擬答：'"
        assert "2. 參考條文：" in drawer_text, "Missing '2. 參考條文：'"
        assert "考場破題核心重點" not in drawer_text, "Unwanted '考場破題核心重點' still present!"
        assert "權威法規與專業公報引註" not in drawer_text, "Unwanted '權威法規與專業公報引註' still present!"

        print("All drawer assertions passed!")

        # 5. Take screenshot of Clean AI Answer Drawer
        drawer_shot = os.path.join(ARTIFACT_DIR, "simplified_ai_answer_drawer.png")
        await page.screenshot(path=drawer_shot)
        print(f"Saved simplified drawer screenshot to {drawer_shot}")

        await browser.close()
        print("Playwright test completed successfully!")

if __name__ == '__main__':
    asyncio.run(test_simplified_view())

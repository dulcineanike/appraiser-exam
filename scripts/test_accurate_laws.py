import asyncio
import os
import sys
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

ARTIFACT_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
INDEX_URL = "file:///d:/不動產估價師歷屆考題/web/index.html"

async def test_accurate_laws():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 950})

        await page.goto(INDEX_URL)
        await page.wait_for_timeout(1000)

        # 1. Search for 土地徵收 in 土地利用法規
        print("Testing 土地利用法規 question on 土地徵收...")
        search_input = page.locator("#searchInput")
        await search_input.fill("徵收")
        await page.locator("#searchSubjectSelect").select_option("土地利用法規")
        await page.wait_for_timeout(400)

        # Open drawer on first result
        drawer_btn = page.locator("#searchResultContainer .question-item .btn-q-action").filter(has_text="參考解答").first
        await drawer_btn.click()
        await page.wait_for_timeout(500)

        drawer_text = await page.locator("#searchResultContainer .answer-drawer").first.inner_text()
        print("Drawer text snippet for 徵收:")
        print(drawer_text[:200])

        assert "土地徵收條例" in drawer_text, "Expected 土地徵收條例 in 徵收 question!"
        assert "民法 第 758 條" not in drawer_text, "Should NOT have unrelated 民法第758條 in 徵收 question!"

        shot1 = os.path.join(ARTIFACT_DIR, "accurate_land_expropriation_laws.png")
        await page.screenshot(path=shot1)
        print(f"Captured accurate expropriation laws to {shot1}")

        # 2. Test Chinese Essay (國文) - should NOT have 2. 參考條文
        print("Testing 國文 question...")
        await search_input.fill("")
        await page.locator("#searchSubjectSelect").select_option("國文")
        await page.wait_for_timeout(400)

        drawer_btn2 = page.locator("#searchResultContainer .question-item .btn-q-action").filter(has_text="參考解答").first
        await drawer_btn2.click()
        await page.wait_for_timeout(500)

        drawer2_text = await page.locator("#searchResultContainer .answer-drawer").first.inner_text()
        print("Drawer text snippet for 國文:")
        print(drawer2_text[:200])

        assert "2. 參考條文：" not in drawer2_text, "國文 question should NOT have '2. 參考條文：'!"

        shot2 = os.path.join(ARTIFACT_DIR, "chinese_essay_clean_no_laws.png")
        await page.screenshot(path=shot2)
        print(f"Captured clean Chinese essay to {shot2}")

        await browser.close()
        print("All precision law matching tests passed!")

if __name__ == '__main__':
    asyncio.run(test_accurate_laws())

import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(WORKSPACE_DIR, 'web')
INDEX_PATH = f"file:///{WEB_DIR.replace(os.sep, '/')}/index.html"
ARTIFACTS_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 1000})
        page = context.new_page()

        print(f"Loading {INDEX_PATH}...")
        page.goto(INDEX_PATH)
        page.wait_for_timeout(1500)

        # 1. Verify Subtitle
        subtitle = page.locator(".brand-subtitle").text_content()
        print(f"Subtitle: {subtitle}")
        assert "AI 最新法規擬答 ＆ 補習班解答系統" in subtitle, "Subtitle not updated!"

        # 2. Search for 114年第1題 (which has both AI legal solution and verified Cram solution)
        page.fill("#searchInput", "平均地權條例第62")
        page.wait_for_timeout(500)

        first_q = page.locator(".question-item").first
        assert first_q.count() > 0, "Question not found!"

        # Open Answer Drawer
        ans_btn = first_q.locator("button:has-text('參考解答')")
        print(f"Answer button text: {ans_btn.text_content().strip()}")
        ans_btn.click()
        page.wait_for_timeout(800)

        # Verify AI Tab
        ai_tab = page.locator(".ans-tab-btn:has-text('AI 精準擬答')")
        assert "active" in ai_tab.get_attribute("class"), "AI tab should be active by default!"
        print("AI tab is active!")

        # Verify National Regulations Database statutes card
        statute_title = page.locator(".statutes-title").first.text_content()
        print(f"Statute Title: {statute_title}")
        assert "全國法規資料庫" in statute_title, "Statute title missing!"

        # Verify Core Cheat-Sheet Box is at the top
        keypoints_title = page.locator(".ans-keypoints-title").first.text_content()
        print(f"Keypoints Title: {keypoints_title}")
        assert "考場破題核心重點" in keypoints_title, "Keypoints box should be at the top!"

        # Verify Exam Trap Box is completely removed (count == 0)
        assert page.locator(".exam-trap-box").count() == 0, "exam-trap-box should be completely removed!"
        print("Verified: exam-trap-box is completely removed!")

        # Capture AI Tab Screenshot
        ai_shot = os.path.join(ARTIFACTS_DIR, "ai_legal_answer_drawer.png")
        page.screenshot(path=ai_shot)
        print(f"Saved AI answer drawer screenshot to {ai_shot}")

        # Switch to Cram School Tab
        cram_tab = page.locator(".ans-tab-btn:has-text('補習班參考解答')")
        cram_tab.click()
        page.wait_for_timeout(600)

        cram_badge = page.locator(".cram-source-badge").first.text_content()
        print(f"Cram Badge: {cram_badge}")
        assert "高點" in cram_badge, "Cram school badge missing!"

        # Capture Verified Cram Tab Screenshot
        cram_shot = os.path.join(ARTIFACTS_DIR, "verified_cram_answer_drawer.png")
        page.screenshot(path=cram_shot)
        print(f"Saved Verified cram answer screenshot to {cram_shot}")

        # Test an uncollected question (e.g. 土地利用法規)
        page.fill("#searchInput", "國土功能分區")
        page.wait_for_timeout(500)
        uncoll_q = page.locator(".question-item").first
        uncoll_btn = uncoll_q.locator("button:has-text('參考解答')")
        uncoll_btn.click()
        page.wait_for_timeout(600)

        # Switch to Cram Tab on uncollected question
        uncoll_cram_tab = uncoll_q.locator(".ans-tab-btn:has-text('補習班參考解答')")
        uncoll_cram_tab.click()
        page.wait_for_timeout(600)

        uncoll_title = uncoll_q.locator(".cram-uncollected-title").text_content()
        print(f"Uncollected Title: {uncoll_title}")
        assert "尚未收錄補習班" in uncoll_title, "Uncollected notice missing!"

        uncoll_shot = os.path.join(ARTIFACTS_DIR, "uncollected_cram_prompt.png")
        page.screenshot(path=uncoll_shot)
        print(f"Saved uncollected prompt screenshot to {uncoll_shot}")

        # Test Stats View
        page.click("button[data-tab='stats']")
        page.wait_for_timeout(600)
        stats_shot = os.path.join(ARTIFACTS_DIR, "stats_dual_track_view.png")
        page.screenshot(path=stats_shot)
        print(f"Saved stats view screenshot to {stats_shot}")

        browser.close()
        print("All dual-track answer drawer tests passed successfully!")

if __name__ == '__main__':
    main()

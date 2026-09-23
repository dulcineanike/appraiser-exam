import os
import sys
import time
import urllib.parse
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def run_test():
    artifacts_dir = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
    abs_path = os.path.abspath(r"web\index.html")
    file_url = f"file:///{urllib.parse.quote(abs_path.replace(os.sep, '/'), safe='/:')}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        print(f"Navigating to {file_url}...")
        page.goto(file_url)
        page.wait_for_timeout(1000)

        # 1. Verify Member Header Capsule
        capsule = page.locator("#memberHeaderBtn")
        capsule_text = capsule.inner_text()
        print(f"Header capsule text: {capsule_text}")
        assert "估價學徒" in capsule_text, "Default rank should be 估價學徒"
        assert "pt" in capsule_text, "Points pill should be visible"

        # 2. Open Member Profile Modal
        capsule.click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(artifacts_dir, "member_profile_modal.png"))
        print("Captured member_profile_modal.png")

        # 3. Switch to Hall of Ranks Tab
        page.locator("#btnMemberTabHall").click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(artifacts_dir, "ranks_hall_tab.png"))
        print("Captured ranks_hall_tab.png")

        # 4. Switch to Leaderboard Tab
        page.locator("#btnMemberTabLeaderboard").click()
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(artifacts_dir, "leaderboard_tab.png"))
        print("Captured leaderboard_tab.png")

        # Close Modal
        page.locator("#memberProfileModal .modal-close-btn").click()
        page.wait_for_timeout(500)

        # 5. Open Question Drawer and switch to Community Notes tab
        print("Testing Community Notes in Question Drawer...")
        # Open first question drawer in search list
        page.locator("button:has-text('📖 參考解答')").first.click()
        page.wait_for_timeout(600)

        # Click Community tab
        comm_tab_btn = page.locator(".ans-tab-btn:has-text('👥 考友社群筆記')").first
        comm_tab_btn.click()
        page.wait_for_timeout(600)

        # Publish a test note
        test_textarea = page.locator(".comm-editor-textarea").first
        test_textarea.fill("【考生實戰高分秘訣】這題請務必先立論權利同一性說，並指出平均地權條例第62條與第64條之他項權利轉載關聯！")
        page.wait_for_timeout(300)

        publish_btn = page.locator(".comm-publish-btn").first
        publish_btn.click()
        page.wait_for_timeout(1000)

        page.screenshot(path=os.path.join(artifacts_dir, "community_notes_tab.png"))
        print("Captured community_notes_tab.png")

        # 6. Test Level Up Celebration by awarding points directly to test upgrade
        print("Triggering points upgrade to test Level-Up modal...")
        page.evaluate("""() => {
            window.AppraiserMembership.addPoints(200, '榮獲考友社群精華解答推薦');
        }""")
        page.wait_for_timeout(800)

        page.screenshot(path=os.path.join(artifacts_dir, "levelup_celebration.png"))
        print("Captured levelup_celebration.png")

        browser.close()
        print("All membership tests passed successfully!")

if __name__ == '__main__':
    run_test()

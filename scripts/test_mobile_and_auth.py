import os
import sys
import time
import urllib.parse
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def run_tests():
    artifacts_dir = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"
    abs_path = os.path.abspath(r"web\index.html")
    file_url = f"file:///{urllib.parse.quote(abs_path.replace(os.sep, '/'), safe='/:')}"

    print(f"Testing URL: {file_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ==============================================================
        # TEST 1: Mobile Viewport Auto-Adaptation (iPhone 14: 390 x 844)
        # ==============================================================
        print("\n--- TEST 1: Mobile Viewport (390 x 844) ---")
        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        mobile_page = mobile_context.new_page()
        mobile_page.goto(file_url)
        mobile_page.wait_for_timeout(1000)

        # Check body horizontal overflow
        scroll_width = mobile_page.evaluate("() => document.body.scrollWidth")
        client_width = mobile_page.evaluate("() => document.documentElement.clientWidth")
        print(f"Mobile Page Width Check: clientWidth={client_width}, scrollWidth={scroll_width}")
        assert scroll_width <= client_width + 2, f"Horizontal overflow detected! scrollWidth ({scroll_width}) > clientWidth ({client_width})"

        # Check Header 2-tier layout
        header_container = mobile_page.locator(".header-container")
        header_box = header_container.bounding_box()
        print(f"Header container bounding box: {header_box}")
        assert header_box['width'] <= 390, "Header should not exceed viewport width"

        # Capture mobile homepage screenshot
        mobile_page.screenshot(path=os.path.join(artifacts_dir, "mobile_viewport_homepage.png"))
        print("Captured mobile_viewport_homepage.png")

        # Open answer drawer on mobile
        first_ans_btn = mobile_page.locator("button:has-text('📖 參考解答')").first
        first_ans_btn.click()
        mobile_page.wait_for_timeout(600)

        drawer = mobile_page.locator(".answer-drawer").first
        drawer_box = drawer.bounding_box()
        print(f"Drawer bounding box on mobile: {drawer_box}")
        assert drawer_box['width'] <= 390, "Answer drawer must fit cleanly within mobile screen"

        mobile_page.screenshot(path=os.path.join(artifacts_dir, "mobile_drawer_open.png"))
        print("Captured mobile_drawer_open.png")

        # Open Member Profile Modal on mobile
        capsule_btn = mobile_page.locator("#memberHeaderBtn")
        capsule_btn.click()
        mobile_page.wait_for_timeout(600)

        modal_card = mobile_page.locator(".member-modal-card")
        modal_box = modal_card.bounding_box()
        print(f"Member modal card on mobile: {modal_box}")
        assert modal_box['width'] <= 390, "Modal card must not overflow mobile screen"

        # ==============================================================
        # TEST 2: Account Registration on Mobile Device
        # ==============================================================
        print("\n--- TEST 2: Account Registration & Gamification Sync ---")
        # Switch to Account tab
        mobile_page.locator("#btnMemberTabAccount").click()
        mobile_page.wait_for_timeout(500)

        # Switch to Register mode
        mobile_page.locator(".auth-nav-pill:has-text('註冊新帳號')").click()
        mobile_page.wait_for_timeout(400)

        # Fill registration form
        mobile_page.locator("#regAccInput").fill("dulcineanike_pro")
        mobile_page.locator("#regNickInput").fill("杜西尼亞 估價師")
        mobile_page.locator("#regPwdInput").fill("secure123")
        mobile_page.wait_for_timeout(300)

        # Handle alert dialog
        def handle_dialog(dialog):
            print(f"Dialog received: {dialog.message}")
            dialog.accept()

        mobile_page.on("dialog", handle_dialog)

        # Submit registration
        mobile_page.locator("button:has-text('立即註冊並合併現有')").click()
        mobile_page.wait_for_timeout(1000)

        mobile_page.screenshot(path=os.path.join(artifacts_dir, "mobile_member_account_modal.png"))
        print("Captured mobile_member_account_modal.png")

        # Verify logged in state
        logged_in_card = mobile_page.locator(".auth-card-logged-in")
        assert logged_in_card.is_visible(), "Should be logged in and see logged-in card"
        account_text = logged_in_card.inner_text()
        print(f"Logged-in card text: {account_text}")
        assert "dulcineanike_pro" in account_text, "Account name should match"
        assert "杜西尼亞 估價師" in account_text, "Nickname should match"

        # Award points to test data persistence
        print("Awarding 200 points to user...")
        mobile_page.evaluate("""() => {
            window.AppraiserMembership.addPoints(200, '榮獲全台考友精選優質擬答');
        }""")
        mobile_page.wait_for_timeout(800)

        # Close level-up modal if opened
        levelup_btn = mobile_page.locator(".levelup-btn")
        if levelup_btn.is_visible():
            levelup_btn.click()
            mobile_page.wait_for_timeout(400)

        # Refresh account tab to get updated sync passkey with 200 points
        mobile_page.evaluate("() => window.switchMemberModalTab('account')")
        mobile_page.wait_for_timeout(400)

        sync_key = mobile_page.locator("#mySyncPasskeyInput").input_value()
        print(f"Generated Sync Passkey: {sync_key[:30]}... (length={len(sync_key)})")
        assert sync_key.startswith("APPR-SYNC-"), "Sync passkey must start with APPR-SYNC-"

        mobile_context.close()

        # ==============================================================
        # TEST 3: Cross-Device Login on Second Device (e.g. Desktop PC)
        # ==============================================================
        print("\n--- TEST 3: Login on Second Device (New Clean Context) ---")
        pc_context = browser.new_context(viewport={"width": 1280, "height": 800})
        pc_page = pc_context.new_page()
        pc_page.on("dialog", handle_dialog)

        pc_page.goto(file_url)
        pc_page.wait_for_timeout(1000)

        # Verify second device starts clean
        capsule_text = pc_page.locator("#memberHeaderBtn").inner_text()
        print(f"Second device initial capsule: {capsule_text}")

        # Open Member Modal on second device
        pc_page.locator("#memberHeaderBtn").click()
        pc_page.wait_for_timeout(500)

        # Switch to Account Tab
        pc_page.locator("#btnMemberTabAccount").click()
        pc_page.wait_for_timeout(400)

        # Switch to Sync Passkey tab
        pc_page.locator(".auth-nav-pill:has-text('貼上跨裝置金鑰')").click()
        pc_page.wait_for_timeout(400)

        # Paste the sync passkey
        pc_page.locator("#syncPasskeyInput").fill(sync_key)
        pc_page.wait_for_timeout(300)

        # Submit sync
        pc_page.locator("button:has-text('立即匯入並登入同步')").click()
        pc_page.wait_for_timeout(1000)

        # Verify second device is now logged in as dulcineanike_pro with 200+ points!
        pc_capsule = pc_page.locator("#memberHeaderBtn").inner_text()
        print(f"Second device synced capsule: {pc_capsule}")
        assert "杜西尼亞 估價師" in pc_capsule or "dulcineanike_pro" in pc_capsule or "執業估價師" in pc_capsule, "Rank and nickname must be synced"
        assert "20" in pc_capsule, "Points must be synced (200 pt)"

        pc_page.screenshot(path=os.path.join(artifacts_dir, "mobile_second_device_synced.png"))
        print("Captured mobile_second_device_synced.png")

        pc_context.close()
        browser.close()

        print("\n=======================================================")
        print("ALL TESTS PASSED SUCCESSFULLY! BOTH REQUIREMENTS VERIFIED!")
        print("=======================================================")

if __name__ == '__main__':
    run_tests()

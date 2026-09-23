# -*- coding: utf-8 -*-
import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENSHOTS_DIR = os.path.join(WORKSPACE_DIR, 'screenshots')
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

html_path = 'file:///' + os.path.join(WORKSPACE_DIR, 'web', 'index.html').replace('\\', '/')

print(f"Testing font sizes on {html_path} ...")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto(html_path)
    page.wait_for_timeout(1000)

    # 1. Check default font sizes in Large mode
    q_font_size = page.evaluate("() => window.getComputedStyle(document.querySelector('.question-body')).fontSize")
    print(f"Default Question Body Font Size: {q_font_size}")

    # Open answer drawer for first question
    page.locator(".question-item .btn-q-action").first.click()
    page.wait_for_timeout(500)

    ans_font_size = page.evaluate("() => window.getComputedStyle(document.querySelector('.ans-model-text')).fontSize")
    print(f"Default Model Answer Font Size: {ans_font_size}")

    # Take screenshot of Default Large Mode
    shot1 = os.path.join(SCREENSHOTS_DIR, 'font_size_default_large.png')
    page.screenshot(path=shot1)
    print(f"Saved {shot1}")

    # 2. Click 'Aa' button to switch to xlarge (特大護眼模式)
    aa_btn = page.locator("#fontSizeBtn")
    aa_btn.click()
    page.wait_for_timeout(600)

    xl_q_size = page.evaluate("() => window.getComputedStyle(document.querySelector('.question-body')).fontSize")
    xl_ans_size = page.evaluate("() => window.getComputedStyle(document.querySelector('.ans-model-text')).fontSize")
    toast_text = page.evaluate("() => document.getElementById('app-toast')?.innerText")
    print(f"X-Large Question Body Font Size: {xl_q_size}")
    print(f"X-Large Model Answer Font Size: {xl_ans_size}")
    print(f"Toast Text: {toast_text}")

    # Take screenshot of X-Large Mode
    shot2 = os.path.join(SCREENSHOTS_DIR, 'font_size_xlarge_mode.png')
    page.screenshot(path=shot2)
    print(f"Saved {shot2}")

    # 3. Switch to 考卷作答室 tab to see exam room paper layout
    page.locator(".tab-btn").nth(2).click()
    page.wait_for_timeout(600)
    shot3 = os.path.join(SCREENSHOTS_DIR, 'font_size_exam_room.png')
    page.screenshot(path=shot3)
    print(f"Saved {shot3}")

    browser.close()
    print("FONT SIZE VERIFICATION COMPLETED SUCCESSFULLY!")

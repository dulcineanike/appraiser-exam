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

print(f"Opening {html_path} ...")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto(html_path)
    page.wait_for_timeout(1000)

    # 1. Verify default view is search (TAB 1)
    active_tab = page.evaluate("() => document.querySelector('.tab-btn.active')?.innerText")
    print(f"Active Tab on start: {active_tab}")
    assert "題庫檢索" in active_tab or "檢索" in active_tab, f"Expected active tab to be 題庫檢索, got {active_tab}"

    # 2. Verify sorting: top question should be 115 年
    first_q_year = page.evaluate("() => document.querySelector('.question-item .q-badge-year')?.innerText")
    print(f"First question year: {first_q_year}")
    assert "115" in first_q_year, f"Expected first question to be 115年, got {first_q_year}"

    # Take screenshot of search homepage
    shot1 = os.path.join(SCREENSHOTS_DIR, 'search_homepage_latest.png')
    page.screenshot(path=shot1)
    print(f"Saved {shot1}")

    # 3. Click '📖 參考解答 (三版)' on the first question
    ans_btn = page.locator(".question-item .btn-q-action").first
    ans_btn.click()
    page.wait_for_timeout(600)

    # Verify answer drawer is visible
    drawer_visible = page.is_visible(".answer-drawer")
    print(f"Answer drawer visible in search: {drawer_visible}")
    assert drawer_visible, "Answer drawer should be visible in search view"

    # Click tab for 3rd teacher (陳翰基)
    page.locator(".answer-drawer .ans-tab-btn").nth(2).click()
    page.wait_for_timeout(400)

    # Take screenshot of answer drawer in search view
    shot2 = os.path.join(SCREENSHOTS_DIR, 'search_answer_drawer.png')
    page.screenshot(path=shot2)
    print(f"Saved {shot2}")

    # 4. Switch to 隨機組卷 tab
    page.locator(".tab-btn").nth(1).click()
    page.wait_for_timeout(600)

    # Check that "僅選民法" button does NOT exist
    minfa_count = page.evaluate("() => Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('僅選民法')).length")
    print(f"'僅選民法' button count: {minfa_count}")
    assert minfa_count == 0, "'僅選民法' button should be removed"

    # Check that "選取專業 6 科" button exists and click it
    all6_btn = page.locator(".config-group button:has-text('選取專業 6 科')").first
    all6_btn.click()
    page.wait_for_timeout(300)

    active_pills = page.evaluate("() => Array.from(document.querySelectorAll('.subject-pill.active')).map(e => e.innerText)")
    print(f"Active subjects count: {len(active_pills)}, subjects: {active_pills}")
    assert len(active_pills) == 6, f"Expected 6 active professional subjects, got {len(active_pills)}"

    # Take screenshot of generator view
    shot3 = os.path.join(SCREENSHOTS_DIR, 'generator_all6_subjects.png')
    page.screenshot(path=shot3)
    print(f"Saved {shot3}")

    # 5. Switch to 題庫統計 tab
    page.locator(".tab-btn").nth(4).click()
    page.wait_for_timeout(600)
    stats_text = page.evaluate("() => document.getElementById('statsContainer')?.innerText")
    print("Stats summary:\n" + stats_text[:200])
    assert "638" in stats_text, f"Expected 638 questions in stats, got {stats_text[:100]}"
    assert "115" in stats_text, f"Expected 115 in stats, got {stats_text[:100]}"

    shot4 = os.path.join(SCREENSHOTS_DIR, 'stats_115_updated.png')
    page.screenshot(path=shot4)
    print(f"Saved {shot4}")

    browser.close()
    print("ALL TESTS PASSED SUCCESSFULLY!")

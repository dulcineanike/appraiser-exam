import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ARTIFACTS_DIR = r"C:\Users\dulci\.gemini\antigravity\brain\bb82d4a9-7423-44dc-a282-a5b7af0be647"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 1300})
    page.goto("file:///D:/不動產估價師歷屆考題/web/index.html")
    page.wait_for_timeout(1000)

    # 1. Test Economics question (search for 差額地租)
    print("Testing Economics question with graph guide...")
    page.fill("#searchInput", "差額地租")
    page.wait_for_timeout(600)
    econ_q = page.locator("#searchResultContainer .question-item").first
    assert econ_q.count() > 0, "Economics question not found!"
    econ_q.locator("button", has_text="參考解答").click()
    page.wait_for_timeout(600)
    # check for graph guide
    assert page.locator(".badge-graph").count() > 0, "badge-graph not found!"
    print("Found badge-graph in Economics question!")
    econ_shot = os.path.join(ARTIFACTS_DIR, "economics_graph_guide.png")
    page.screenshot(path=econ_shot)
    print("Saved economics screenshot:", econ_shot)

    # 2. Test Appraisal Practice / Theory with Gazette & Calculation
    print("Testing Appraisal question with Gazette & Calculation...")
    page.fill("#searchInput", "土地開發分析")
    page.wait_for_timeout(600)
    appr_q = page.locator("#searchResultContainer .question-item").first
    assert appr_q.count() > 0, "Appraisal question not found!"
    appr_q.locator("button", has_text="參考解答").click()
    page.wait_for_timeout(600)
    statute_text = page.locator("#searchResultContainer .statutes-card").first.text_content()
    print("Statute Card Content Snippet:", statute_text[:80])
    assert "公報" in statute_text or "技術規則" in statute_text, "Gazette or Tech rule missing!"
    appr_shot = os.path.join(ARTIFACTS_DIR, "appraisal_gazette_calc.png")
    page.screenshot(path=appr_shot)
    print("Saved appraisal screenshot:", appr_shot)

    # 3. Test Civil Law with Precedents / Grand Chamber
    print("Testing Civil Law with Grand Chamber Precedents...")
    page.fill("#searchInput", "設定抵押權")
    page.wait_for_timeout(600)
    civil_q = page.locator("#searchResultContainer .question-item").first
    assert civil_q.count() > 0, "Civil law question not found!"
    civil_q.locator("button", has_text="參考解答").click()
    page.wait_for_timeout(600)
    civil_statute = page.locator("#searchResultContainer .statutes-card").first.text_content()
    print("Civil Statute Card Snippet:", civil_statute[:80])
    assert "院字第1446號" in civil_statute or "866" in civil_statute, "Precedent missing!"
    civil_shot = os.path.join(ARTIFACTS_DIR, "civil_precedent_drawer.png")
    page.screenshot(path=civil_shot)
    print("Saved civil law screenshot:", civil_shot)

    browser.close()
    print("All specialized capability verification tests passed successfully!")

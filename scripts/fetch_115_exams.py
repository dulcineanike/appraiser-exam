# -*- coding: utf-8 -*-
import os
import sys
import json
import urllib.request
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    print("Loading moex search page...")
    page.goto('https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx', timeout=30000)
    page.wait_for_timeout(2000)

    # Select 115130
    page.select_option('#ctl00_holderContent_ddlExamCode', '115130')
    page.wait_for_timeout(2500)

    # Click search button
    search_btn = page.locator('#ctl00_holderContent_btnSearch')
    if search_btn.count() > 0:
        search_btn.click()
        page.wait_for_timeout(4000)

    # Check results table or links
    rows = page.evaluate("""() => {
        const trs = Array.from(document.querySelectorAll('table tr'));
        const results = [];
        for (const tr of trs) {
            const text = tr.innerText.trim();
            if (text.includes('不動產估價師') || text.includes('民法') || text.includes('估價') || text.includes('土地利用')) {
                const links = Array.from(tr.querySelectorAll('a')).map(a => ({
                    text: a.innerText.trim(),
                    href: a.href
                }));
                results.push({ rowText: text, links });
            }
        }
        return results;
    }""")

    print(f"Found {len(rows)} matching rows:")
    download_targets = []
    for r in rows:
        print("ROW:", r['rowText'][:100])
        for l in r['links']:
            print("  LINK:", l['text'], "=>", l['href'])
            if 'pdf' in l['href'].lower() or 'Download' in l['href']:
                download_targets.append(l)

    # If rows is empty, let's dump all table text or select options
    if not rows:
        print("No rows found. Dumping page content summary:")
        print(page.inner_text('body')[:1000])

    browser.close()

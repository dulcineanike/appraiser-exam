import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 900})
        
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        
        html_path = 'file:///' + os.path.abspath('web/index.html').replace('\\', '/')
        print('Navigating to:', html_path)
        page.goto(html_path)
        
        q_count = page.evaluate('() => window.EXAM_QUESTIONS ? window.EXAM_QUESTIONS.length : 0')
        print(f'Questions loaded in browser: {q_count}')
        assert q_count == 612, f'Expected 612 questions, got {q_count}'
        
        ans_count = page.evaluate('() => window.EXAM_ANSWERS ? Object.keys(window.EXAM_ANSWERS).length : 0')
        print(f'Answers database loaded in browser: {ans_count} entries')
        assert ans_count > 500, f'Expected >500 answers, got {ans_count}'

        # Take screenshot of generator view
        os.makedirs('screenshots', exist_ok=True)
        page.screenshot(path='screenshots/generator_view.png', full_page=True)
        print('Saved screenshot: screenshots/generator_view.png')

        # Test preset civil4
        print('Testing preset: civil4 (民法 4 題)...')
        page.evaluate("() => window.quickPreset('civil4')")
        page.wait_for_timeout(600)
        
        rendered_items = page.locator('.question-item').count()
        print(f'Rendered question items in exam view: {rendered_items}')
        assert rendered_items == 4, f'Expected 4 questions, got {rendered_items}'
        
        # Test clicking "三版解答" on Question 1
        print('Opening Three-Version Answer Drawer on Question 1...')
        page.locator('.question-item').first.locator('button:has-text("三版解答")').click()
        page.wait_for_timeout(400)
        
        drawer = page.locator('.answer-drawer').first
        assert drawer.is_visible(), 'Answer drawer should be visible'
        print('Answer drawer opened successfully!')
        
        # Verify tabs exist
        assert page.locator('button:has-text("高點・許文昌")').is_visible()
        assert page.locator('button:has-text("公職王・志光")').is_visible()
        assert page.locator('button:has-text("首宇・陳翰基")').is_visible()
        print('All 3 teacher tabs are visible!')
        
        # Switch to Gongzhiwang
        page.locator('button:has-text("公職王・志光")').click()
        page.wait_for_timeout(300)
        teacher_text = page.locator('.ans-teacher-title').first.inner_text()
        print(f'Active teacher after switch: {teacher_text}')
        
        # Switch to Chen Han-Ji
        page.locator('button:has-text("首宇・陳翰基")').click()
        page.wait_for_timeout(300)
        teacher_text = page.locator('.ans-teacher-title').first.inner_text()
        print(f'Active teacher after switch: {teacher_text}')
        
        # Test "★ 三版精華全引" (Synthesize points from all 3 teachers into note)
        print('Testing "★ 三版精華全引" button...')
        page.locator('button:has-text("★ 三版精華全引")').click()
        page.wait_for_timeout(300)
        
        # Check scratchpad content
        note_val = page.locator('.scratchpad-textarea').first.input_value()
        print(f'Synthesized note preview:\n{note_val[:160]}...\n')
        assert '高點' in note_val and '公職王' in note_val and '首宇' in note_val, 'All 3 versions should be quoted in notes!'
        print('SUCCESS: All 3 versions successfully synthesized into notes!')

        # Take screenshot of open drawer and scratchpad
        page.screenshot(path='screenshots/answers_drawer.png', full_page=True)
        print('Saved screenshot: screenshots/answers_drawer.png')
        
        # Screenshot of exam view
        page.screenshot(path='screenshots/exam_civil4.png', full_page=True)
        print('Saved screenshot: screenshots/exam_civil4.png')
        
        # Test Tab switching: Search
        page.click('[data-tab="search"]')
        page.wait_for_timeout(300)
        page.fill('#searchInput', '抵押權')
        page.wait_for_timeout(400)
        page.screenshot(path='screenshots/search_view.png', full_page=True)
        print('Saved screenshot: screenshots/search_view.png')
        
        # Test Tab switching: Stats
        page.click('[data-tab="stats"]')
        page.wait_for_timeout(300)
        page.screenshot(path='screenshots/stats_view.png', full_page=True)
        print('Saved screenshot: screenshots/stats_view.png')
        
        if console_errors:
            print('Console errors detected:', console_errors)
        else:
            print('ALL TESTS PASSED! No console errors, flawless execution!')
            
        browser.close()

if __name__ == '__main__':
    main()

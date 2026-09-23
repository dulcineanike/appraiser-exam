import glob
import os
import re
import sys
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

def clean_text(t):
    # Normalize unicode / punctuation
    t = t.replace('\ue129', '㈠').replace('\ue12a', '㈡').replace('\ue12b', '㈢').replace('\ue12c', '㈣')
    t = t.replace('\ue131', '㈠').replace('\ue132', '㈡').replace('\ue133', '㈢')
    t = t.replace('', '㈠').replace('', '㈡').replace('', '㈢').replace('', '㈣')
    return t

def get_questions(filepath):
    doc = pymupdf.open(filepath)
    full_text = '\n'.join([page.get_text() for page in doc])
    full_text = clean_text(full_text)

    # First attempt: standard 一、 二、 三、 四、
    pattern = re.compile(r'(?:^|\n)([一二三四五六七八九十]+[、．.])\s*([\s\S]+?)(?=(?:\n[一二三四五六七八九十]+[、．.]|\n乙、|\n[0-9]{1,2}\s+[^\n]+|\Z))')
    matches = pattern.findall(full_text)

    valid_matches = []
    for num, content in matches:
        content = content.strip()
        content = re.sub(r'代號：\d+[\s\S]*?頁次：\d+－\d+', '', content).strip()
        content = re.sub(r'代號：\d+', '', content).strip()
        if len(content) > 15:
            valid_matches.append((num, content))

    if not valid_matches:
        # Try block parsing (e.g. 114130_0301)
        blocks = []
        for page in doc:
            for b in page.get_text('blocks'):
                btxt = clean_text(b[4].strip())
                if any(k in btxt for k in ['※注意：', '代號：', '考試試題', '等\n別：', '頁次：', '全一頁']):
                    continue
                if re.search(r'（\d+\s*分）', btxt) or len(btxt) > 50:
                    blocks.append(btxt)
        c_nums = ['一、', '二、', '三、', '四、', '五、', '六、']
        for i, b in enumerate(blocks):
            q_num = c_nums[i] if i < len(c_nums) else f'{i+1}、'
            valid_matches.append((q_num, b))

    return valid_matches

for p in ['114130_0301_民法物權與不動產法規.pdf', '110140_0301_民法物權與不動產法規.pdf', '105130_0301_民法物權與不動產法規.pdf']:
    print('====================', p, '====================')
    qs = get_questions(p)
    print(f'Total questions found: {len(qs)}')
    for qnum, qtext in qs:
        pts = re.findall(r'（(\d+)\s*分）|\((\d+)\s*分\)', qtext)
        pts_str = (pts[-1][0] or pts[-1][1]) if pts else '25'
        first_line = qtext.split('\n')[0]
        print(f'{qnum} [{pts_str}分] {first_line[:45]}... (len={len(qtext)})')

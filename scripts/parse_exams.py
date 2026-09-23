import glob
import json
import os
import re
import sys
import pymupdf

sys.stdout.reconfigure(encoding='utf-8')

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(WORKSPACE_DIR, 'data')
WEB_DIR = os.path.join(WORKSPACE_DIR, 'web')
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(WEB_DIR, exist_ok=True)

def standardize_subject(raw_sub):
    if '民法' in raw_sub:
        return '民法物權與不動產法規'
    elif '土地利用' in raw_sub:
        return '土地利用法規'
    elif '投資' in raw_sub:
        return '不動產投資分析'
    elif '經濟學' in raw_sub:
        return '不動產經濟學'
    elif '估價理論' in raw_sub:
        return '不動產估價理論'
    elif '估價實務' in raw_sub:
        return '不動產估價實務'
    elif '國文' in raw_sub:
        return '國文'
    elif '憲法' in raw_sub:
        return '中華民國憲法'
    return raw_sub

def clean_text(t):
    pua_map = {
        '\ue129': '㈠', '\ue12a': '㈡', '\ue12b': '㈢', '\ue12c': '㈣',
        '\ue131': '㈠', '\ue132': '㈡', '\ue133': '㈢',
        '': '㈠', '': '㈡', '': '㈢', '': '㈣',
        '': '㈠', '': '㈡', '': '㈢', '': '㈣', '': '㈤',
        '說': '說', '兩': '兩', '年': '年', '不': '不', '律': '律',
        '來': '來', '行': '行', '類': '類', '都': '都', '更': '更',
        '利': '利', '說': '說', '異': '異', '留': '留', '契': '契',
        '數': '數', '理': '理', '條例': '條例', '降': '降',
        '︵': '（', '︶': '）', '（背面）': '', '（正面）': '', '全一張': '', '全一頁': ''
    }
    for k, v in pua_map.items():
        t = t.replace(k, v)
    return t

def handle_vertical_text(raw):
    lines = [l.strip() for l in raw.split('\n') if l.strip()]
    if not lines:
        return ""
    single_count = sum(1 for l in lines if len(l) == 1)
    if single_count / len(lines) > 0.4:
        # Reconstruct vertical writing by joining characters with newlines before question numbers
        joined = ''.join(lines)
        # add newlines before Chinese numerals
        joined = re.sub(r'([一二三四五六七八九十]+[、．.])', r'\n\1', joined)
        return joined
    return raw

def extract_points(q_text, default_pts=25):
    matches = re.findall(r'[（\(](\d+)\s*分[）\)]', q_text)
    if matches:
        try:
            return int(matches[-1])
        except ValueError:
            pass
    c_pts = {
        '十分': 10, '十五分': 15, '二十分': 20, '二十五分': 25,
        '三十分': 30, '三十五分': 35, '四十分': 40, '五十分': 50,
        '一百分': 100
    }
    for ck, cv in c_pts.items():
        if ck in q_text:
            return cv
    return default_pts

def parse_pdf_file(filepath):
    filename = os.path.basename(filepath)
    if 'ANS' in filename or 'MOD' in filename:
        return []

    parts = filename.replace('.pdf', '').split('_')
    year_str = parts[0][:3]
    try:
        roc_year = int(year_str)
        ad_year = roc_year + 1911
    except ValueError:
        roc_year = 0
        ad_year = 0

    exam_code = parts[1] if len(parts) > 1 else ''
    raw_sub = parts[2] if len(parts) > 2 else parts[0]
    subject = standardize_subject(raw_sub)

    doc = pymupdf.open(filepath)
    if len(doc) == 0:
        return []

    page_texts = []
    for i, page in enumerate(doc):
        raw = page.get_text()
        ptxt = handle_vertical_text(raw)
        ptxt = clean_text(ptxt)
        
        if i == 0:
            header_patterns = [r'頁次：\d+－\d+', r'座號：[^\n]*\n']
            split_pos = 0
            for hp in header_patterns:
                m = list(re.finditer(hp, ptxt))
                if m:
                    split_pos = max(split_pos, m[0].end())
            if split_pos > 0:
                ptxt = ptxt[split_pos:]
        else:
            ptxt = re.sub(r'^\s*代號：\d+[\s\S]*?頁次：\d+－\d+\s*', '', ptxt)
            ptxt = re.sub(r'^\s*代號：\d+\s*', '', ptxt)

        page_texts.append(ptxt)

    full_text = '\n'.join(page_texts)
    if len(full_text.strip()) < 30:
        return []

    # Cut off multiple-choice section if present
    mcq_idx = full_text.find('乙、測驗題')
    if mcq_idx != -1:
        full_text = full_text[:mcq_idx]

    # Clean residual headers
    full_text = re.sub(r'代號：\d+[\s\S]*?頁次：\d+－\d+', '', full_text)
    full_text = re.sub(r'代號：\d+', '', full_text)
    full_text = re.sub(r'頁次：\d+－\d+', '', full_text)
    full_text = re.sub(r'（請接背面）', '', full_text)

    # Clean instructions at top of full_text
    full_text = re.sub(r'^[\s\S]*?(?=甲、申論題|一、|依[^\n]+|[甲乙丙丁某]|有[AB]|土地|請|何謂|都市|童話|試|何|近|為)', '', full_text)
    full_text = re.sub(r'^甲、申論題[^\n]*\n', '', full_text).strip()
    full_text = re.sub(r'^申論題不必抄題[^\n]*\n', '', full_text).strip()
    full_text = re.sub(r'^請以[藍黑]色[^\n]*\n', '', full_text).strip()

    questions = []

    # Special handling for 不動產估價實務 comprehensive reports
    if subject == '不動產估價實務':
        if any(k in full_text for k in ['委託估價基本', '完整不動產估價報告書', '不動產估價實務撰寫', '估價條件基本說明', '委託人：']):
            clean_body = re.sub(r'※注意：[^\n]+', '', full_text).strip()
            # If there's an explicit 貳、 that's a second question with its own points
            yi_pat = re.compile(r'(?:^|\n)([壹貳參肆伍]+[、．.])\s*')
            yi_splits = list(yi_pat.finditer(clean_body))
            has_two_main = False
            if len(yi_splits) >= 2:
                q1_chunk = clean_body[yi_splits[0].start():yi_splits[1].start()]
                q2_chunk = clean_body[yi_splits[1].start():]
                if '（' in q1_chunk and '分）' in q1_chunk and '（' in q2_chunk and '分）' in q2_chunk and '委託人' not in q2_chunk:
                    has_two_main = True
                    questions.append({'num': '一', 'content': q1_chunk.strip()})
                    questions.append({'num': '二', 'content': q2_chunk.strip()})

            if not has_two_main:
                questions.append({'num': '一', 'content': clean_body})

    if not questions:
        # Standard splitting by 一、 二、 三、 四、
        pat_cnum = re.compile(r'(?:^|\n)([一二三四五六七八九十]+[、．.])\s*')
        splits = list(pat_cnum.finditer(full_text))

        if len(splits) >= 2:
            for i in range(len(splits)):
                q_num_char = splits[i].group(1).replace('、', '').replace('．', '').replace('.', '').strip()
                start = splits[i].end()
                end = splits[i+1].start() if i+1 < len(splits) else len(full_text)
                q_content = full_text[start:end].strip()
                q_content = re.sub(r'^※注意：[^\n]+', '', q_content).strip()
                # Skip invalid short items that look like table properties
                if len(q_content) > 15 and not q_content.startswith('價格日期：') and not q_content.startswith('勘察日期：'):
                    questions.append({
                        'num': q_num_char,
                        'content': q_content
                    })
        else:
            # Method 2: Split by （XX 分）
            chunks = re.split(r'([（\(]\d+\s*分[）\)])', full_text)
            if len(chunks) >= 3:
                c_nums = ['一', '二', '三', '四', '五', '六', '七', '八']
                idx = 0
                for i in range(0, len(chunks)-1, 2):
                    q_text = (chunks[i].strip() + ' ' + chunks[i+1].strip()).strip()
                    q_text = re.sub(r'^※注意：[\s\S]*?(?=\b[A-Za-z\u4e00-\u9fa5])', '', q_text).strip()
                    if len(q_text) > 20:
                        q_num_char = c_nums[idx] if idx < len(c_nums) else str(idx+1)
                        questions.append({
                            'num': q_num_char,
                            'content': q_text
                        })
                        idx += 1
            elif len(full_text.strip()) > 50:
                clean_body = re.sub(r'※注意：[^\n]+', '', full_text).strip()
                questions.append({
                    'num': '一',
                    'content': clean_body
                })

    results = []
    for item in questions:
        q_text = item['content']
        default_p = 100 if len(questions) == 1 else (50 if len(questions) == 2 else 25)
        pts = extract_points(q_text, default_pts=default_p)

        lines = [l.strip() for l in q_text.split('\n') if l.strip() and not l.strip().startswith('（')]
        title_snippet = lines[0][:60] if lines else q_text[:60]
        
        sub_qs = re.findall(r'([㈠㈡㈢㈣㈤㈥]|(?:\([一二三四五六\d]+\)))', q_text)
        
        prefix_id = parts[0]
        q_id = f'{prefix_id}_{exam_code}_{item["num"]}_{len(results)+1}'
        results.append({
            'id': q_id,
            'year': roc_year,
            'year_ad': ad_year,
            'subject': subject,
            'raw_subject': raw_sub,
            'question_no': item['num'],
            'points': pts,
            'title': title_snippet,
            'content': q_text,
            'has_subquestions': len(sub_qs) > 0,
            'subquestions_count': len(sub_qs),
            'source_pdf': filename,
            'char_count': len(q_text)
        })

    return results

def main():
    pdf_files = sorted(glob.glob(os.path.join(WORKSPACE_DIR, '*.pdf')))
    print(f'Found {len(pdf_files)} PDF files in total.')

    all_questions = []
    subject_counts = {}
    year_counts = {}

    for p in pdf_files:
        qs = parse_pdf_file(p)
        for q in qs:
            all_questions.append(q)
            sub = q['subject']
            subject_counts[sub] = subject_counts.get(sub, 0) + 1
            yr = q['year']
            year_counts[yr] = year_counts.get(yr, 0) + 1

    out_file = os.path.join(DATA_DIR, 'questions.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    out_js = os.path.join(WEB_DIR, 'questions_data.js')
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write('// 歷屆不動產估價師考古題資料庫（自動產生）\n')
        f.write('window.EXAM_QUESTIONS = ')
        json.dump(all_questions, f, ensure_ascii=False)
        f.write(';\n')

    print(f'\nSuccessfully parsed {len(all_questions)} questions!')
    print(f'Saved to: {out_file} and {out_js}')

    print('\n--- Questions by Subject ---')
    for sub, count in sorted(subject_counts.items(), key=lambda x: -x[1]):
        print(f'  {sub:<18} : {count:3d} 題')

    print('\n--- Questions by Year (民國年) ---')
    for yr in sorted(year_counts.keys()):
        print(f'  民國 {yr:3d} 年 ({yr+1911}) : {year_counts[yr]:3d} 題')

if __name__ == '__main__':
    main()

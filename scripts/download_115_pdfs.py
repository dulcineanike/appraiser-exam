# -*- coding: utf-8 -*-
import os
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

subjects = [
    ("0101", "國文（作文）", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0101&q=1"),
    ("0301", "民法物權與不動產法規", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0301&q=1"),
    ("0302", "土地利用法規", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0302&q=1"),
    ("0303", "不動產投資分析", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0303&q=1"),
    ("0304", "不動產估價實務", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0304&q=1"),
    ("0305", "不動產經濟學", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0305&q=1"),
    ("0306", "不動產估價理論", "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=115130&c=905&s=0306&q=1"),
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://wwwq.moex.gov.tw/exam/wFrmExamQandASearch.aspx'
}

downloaded_files = []

for code, sub_name, url in subjects:
    filename = f"115130_{code}_{sub_name}.pdf"
    dest = os.path.join(WORKSPACE_DIR, filename)
    print(f"Downloading {filename} from {url} ...")
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.status_code == 200 and len(r.content) > 1000 and r.content.startswith(b'%PDF'):
            with open(dest, 'wb') as f:
                f.write(r.content)
            print(f"  -> Successfully saved {filename} ({len(r.content)/1024:.1f} KB)")
            downloaded_files.append(dest)
        else:
            print(f"  -> Warning: Failed to download {filename}, status: {r.status_code}, content size: {len(r.content)}")
            if not r.content.startswith(b'%PDF'):
                print("  -> First 100 bytes:", r.content[:100])
    except Exception as e:
        print(f"  -> Error: {e}")

print(f"\nTotal downloaded: {len(downloaded_files)} files.")

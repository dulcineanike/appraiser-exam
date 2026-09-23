import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'questions.json')

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total questions loaded: {len(data)}')

empty_content = [q for q in data if not q['content'].strip()]
short_content = [q for q in data if len(q['content'].strip()) < 25]

print(f'Empty content: {len(empty_content)}')
print(f'Short content (<25 chars): {len(short_content)}')
for s in short_content:
    print('  Short sample:', s['subject'], s['year'], s['question_no'], repr(s['content']))

# Sample 3 Civil Law questions
print('\n--- Sample Civil Law Questions (民法物權與不動產法規) ---')
civil_qs = [q for q in data if q['subject'] == '民法物權與不動產法規']
for q in civil_qs[:3]:
    print(f"\n[民國 {q['year']} 年 第 {q['question_no']} 題] ({q['points']}分)")
    print(q['content'])

# Sample 1 Investment Analysis question
print('\n--- Sample Real Estate Investment Analysis Question (不動產投資分析) ---')
inv_qs = [q for q in data if q['subject'] == '不動產投資分析']
for q in inv_qs[-1:]:
    print(f"\n[民國 {q['year']} 年 第 {q['question_no']} 題] ({q['points']}分)")
    print(q['content'])

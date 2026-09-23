# -*- coding: utf-8 -*-
import glob
import os
import sys
from parse_exams import parse_pdf_file

sys.stdout.reconfigure(encoding='utf-8')

files = sorted(glob.glob('115130_*.pdf'))
print(f"Found {len(files)} files for 115:")
total_qs = 0
for f in files:
    qs = parse_pdf_file(f)
    total_qs += len(qs)
    print(f"\nFile: {f} -> {len(qs)} questions:")
    for q in qs:
        print(f"  [{q['question_no']}] ({q['points']}分) {q['title']}")
        print(f"      ID: {q['id']}")

print(f"\nTotal 115 questions parsed: {total_qs}")

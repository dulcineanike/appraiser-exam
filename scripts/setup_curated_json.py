# -*- coding: utf-8 -*-
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(WORKSPACE_DIR, 'data')

# Import curated_115 dictionary from inject_115_curated
from inject_115_curated import curated_115

curated_file = os.path.join(DATA_DIR, 'curated_answers.json')
with open(curated_file, 'w', encoding='utf-8') as f:
    json.dump(curated_115, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(curated_115)} curated answers to {curated_file}")

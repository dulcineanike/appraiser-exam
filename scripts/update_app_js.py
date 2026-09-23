import os
import re

WEB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')
app_js_path = os.path.join(WEB_DIR, 'app.js')

with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initial state: currentTab = 'search', selectedSubjects = [...PROFESSIONAL_SUBJECTS]
content = re.sub(
    r"let currentTab = 'generator';",
    "let currentTab = 'search';",
    content
)
content = re.sub(
    r"let selectedSubjects = \['民法物權與不動產法規'\];",
    "let selectedSubjects = [...PROFESSIONAL_SUBJECTS];",
    content
)

# 2. Update renderInitialView to switch to 'search' and pass PROFESSIONAL_SUBJECTS
content = re.sub(
    r"generateExam\(\['民法物權與不動產法規'\], 4, 'all', false\);\s*switchTab\('generator'\);",
    "generateExam(selectedSubjects, 4, 'all', false);\n    switchTab('search');",
    content
)

# 3. Update toggleAnswerDrawer and switchAnsTab to re-render search when currentTab === 'search'
old_drawer_actions = """  // Answer Drawer Actions
  window.toggleAnswerDrawer = function (qId, idx) {
    if (openAnswerDrawers.has(qId)) {
      openAnswerDrawers.delete(qId);
    } else {
      openAnswerDrawers.add(qId);
      if (!activeAnswerTabs[qId]) {
        activeAnswerTabs[qId] = 'gaodian';
      }
    }
    renderExamPaper();
  };

  window.switchAnsTab = function (qId, tabKey) {
    activeAnswerTabs[qId] = tabKey;
    renderExamPaper();
  };"""

new_drawer_actions = """  // Answer Drawer Actions
  window.toggleAnswerDrawer = function (qId, idx) {
    if (openAnswerDrawers.has(qId)) {
      openAnswerDrawers.delete(qId);
    } else {
      openAnswerDrawers.add(qId);
      if (!activeAnswerTabs[qId]) {
        activeAnswerTabs[qId] = 'gaodian';
      }
    }
    if (currentTab === 'search') {
      renderSearchList();
    } else {
      renderExamPaper();
    }
  };

  window.switchAnsTab = function (qId, tabKey) {
    activeAnswerTabs[qId] = tabKey;
    if (currentTab === 'search') {
      renderSearchList();
    } else {
      renderExamPaper();
    }
  };"""

if old_drawer_actions in content:
    content = content.replace(old_drawer_actions, new_drawer_actions)
else:
    print("Warning: old_drawer_actions not found exactly, will check regex")

# 4. Update copy functions to handle idx === null (in Search mode)
old_copy_funcs = """  window.copySinglePointToNote = function (qId, idx, pointText) {
    let current = notes[qId] || '';
    current += (current ? '\\n' : '') + `• ${pointText}`;
    handleNoteInput(qId, current);

    const el = document.getElementById(`scratchpad-${idx}`);
    if (el) {
      el.style.display = 'block';
      const textarea = el.querySelector('textarea');
      if (textarea) textarea.value = current;
    }
  };

  window.copyKeyPointsToNote = function (qId, idx, tabKey) {
    const ansData = allAnswers[qId];
    if (!ansData || !ansData[tabKey]) return;
    const points = ansData[tabKey].key_points || [];
    if (!points.length) return;
    const teacherName = tabKey === 'gaodian' ? '高點' : (tabKey === 'gongzhiwang' ? '公職王' : '陳翰基');
    const block = `〔${teacherName}重點〕：\\n` + points.map(p => `• ${p}`).join('\\n');
    let current = notes[qId] || '';
    current += (current ? '\\n\\n' : '') + block;
    handleNoteInput(qId, current);

    const el = document.getElementById(`scratchpad-${idx}`);
    if (el) {
      el.style.display = 'block';
      const textarea = el.querySelector('textarea');
      if (textarea) textarea.value = current;
    }
  };

  window.copyAllThreeToNote = function (qId, idx) {
    const ansData = allAnswers[qId];
    if (!ansData) return;
    let block = `【名師三版精華重點對照】\\n`;
    if (ansData.gaodian) {
      block += `〔高點・許文昌/曾榮耀〕：\\n` + (ansData.gaodian.key_points || []).map(p => `• ${p}`).join('\\n') + `\\n\\n`;
    }
    if (ansData.gongzhiwang) {
      block += `〔公職王・名師團隊〕：\\n` + (ansData.gongzhiwang.key_points || []).map(p => `• ${p}`).join('\\n') + `\\n\\n`;
    }
    if (ansData.chenhanji) {
      block += `〔首宇・陳翰基老師〕：\\n` + (ansData.chenhanji.key_points || []).map(p => `• ${p}`).join('\\n');
    }
    let current = notes[qId] || '';
    current += (current ? '\\n\\n' : '') + block.trim();
    handleNoteInput(qId, current);

    const el = document.getElementById(`scratchpad-${idx}`);
    if (el) {
      el.style.display = 'block';
      const textarea = el.querySelector('textarea');
      if (textarea) textarea.value = current;
    }
  };

  window.openCustomAnswerPrompt = function (qId, tabKey) {
    const ansData = allAnswers[qId] || {};
    const currentVer = ansData[tabKey] || {};
    const teacherName = tabKey === 'gaodian' ? '高點' : (tabKey === 'gongzhiwang' ? '公職王' : '陳翰基');
    const newAnswer = prompt(
      `請輸入或貼上【${teacherName}】之補充擬答或精要筆記：`,
      currentVer.solution_outline || ''
    );
    if (newAnswer !== null) {
      if (!ansData[tabKey]) ansData[tabKey] = {};
      ansData[tabKey].solution_outline = newAnswer;
      allAnswers[qId] = ansData;
      try {
        const customAns = JSON.parse(localStorage.getItem('appraiser_custom_answers') || '{}');
        customAns[qId] = ansData;
        localStorage.setItem('appraiser_custom_answers', JSON.stringify(customAns));
      } catch (e) {}
      renderExamPaper();
    }
  };"""

new_copy_funcs = """  window.copySinglePointToNote = function (qId, idx, pointText) {
    let current = notes[qId] || '';
    current += (current ? '\\n' : '') + `• ${pointText}`;
    handleNoteInput(qId, current);

    if (idx !== null && idx !== undefined) {
      const el = document.getElementById(`scratchpad-${idx}`);
      if (el) {
        el.style.display = 'block';
        const textarea = el.querySelector('textarea');
        if (textarea) textarea.value = current;
      }
    } else {
      try {
        navigator.clipboard.writeText(`• ${pointText}`);
      } catch (e) {}
      alert('已記錄至本題筆記，並已複製到剪貼簿！');
    }
  };

  window.copyKeyPointsToNote = function (qId, idx, tabKey) {
    const ansData = allAnswers[qId];
    if (!ansData || !ansData[tabKey]) return;
    const points = ansData[tabKey].key_points || [];
    if (!points.length) return;
    const teacherName = tabKey === 'gaodian' ? '高點' : (tabKey === 'gongzhiwang' ? '公職王' : '陳翰基');
    const block = `〔${teacherName}重點〕：\\n` + points.map(p => `• ${p}`).join('\\n');
    let current = notes[qId] || '';
    current += (current ? '\\n\\n' : '') + block;
    handleNoteInput(qId, current);

    if (idx !== null && idx !== undefined) {
      const el = document.getElementById(`scratchpad-${idx}`);
      if (el) {
        el.style.display = 'block';
        const textarea = el.querySelector('textarea');
        if (textarea) textarea.value = current;
      }
    } else {
      try {
        navigator.clipboard.writeText(block);
      } catch (e) {}
      alert(`已將【${teacherName}】重點記錄至本題筆記，並複製至剪貼簿！`);
    }
  };

  window.copyAllThreeToNote = function (qId, idx) {
    const ansData = allAnswers[qId];
    if (!ansData) return;
    let block = `【名師三版精華重點對照】\\n`;
    if (ansData.gaodian) {
      block += `〔高點・許文昌/曾榮耀〕：\\n` + (ansData.gaodian.key_points || []).map(p => `• ${p}`).join('\\n') + `\\n\\n`;
    }
    if (ansData.gongzhiwang) {
      block += `〔公職王・名師團隊〕：\\n` + (ansData.gongzhiwang.key_points || []).map(p => `• ${p}`).join('\\n') + `\\n\\n`;
    }
    if (ansData.chenhanji) {
      block += `〔首宇・陳翰基老師〕：\\n` + (ansData.chenhanji.key_points || []).map(p => `• ${p}`).join('\\n');
    }
    let current = notes[qId] || '';
    current += (current ? '\\n\\n' : '') + block.trim();
    handleNoteInput(qId, current);

    if (idx !== null && idx !== undefined) {
      const el = document.getElementById(`scratchpad-${idx}`);
      if (el) {
        el.style.display = 'block';
        const textarea = el.querySelector('textarea');
        if (textarea) textarea.value = current;
      }
    } else {
      try {
        navigator.clipboard.writeText(block.trim());
      } catch (e) {}
      alert('已整合三版名師精華至本題筆記，並已複製到剪貼簿！');
    }
  };

  window.openCustomAnswerPrompt = function (qId, tabKey) {
    const ansData = allAnswers[qId] || {};
    const currentVer = ansData[tabKey] || {};
    const teacherName = tabKey === 'gaodian' ? '高點' : (tabKey === 'gongzhiwang' ? '公職王' : '陳翰基');
    const newAnswer = prompt(
      `請輸入或貼上【${teacherName}】之補充擬答或精要筆記：`,
      currentVer.solution_outline || ''
    );
    if (newAnswer !== null) {
      if (!ansData[tabKey]) ansData[tabKey] = {};
      ansData[tabKey].solution_outline = newAnswer;
      allAnswers[qId] = ansData;
      try {
        const customAns = JSON.parse(localStorage.getItem('appraiser_custom_answers') || '{}');
        customAns[qId] = ansData;
        localStorage.setItem('appraiser_custom_answers', JSON.stringify(customAns));
      } catch (e) {}
      if (currentTab === 'search') {
        renderSearchList();
      } else {
        renderExamPaper();
      }
    }
  };"""

if old_copy_funcs in content:
    content = content.replace(old_copy_funcs, new_copy_funcs)
else:
    print("Warning: old_copy_funcs not found exactly, will check regex")

# 5. Update renderSearchList to sort by latest year first, and include Answer Drawer button
old_render_search = """  // Search & Bank Browser
  window.renderSearchList = function () {
    const container = document.getElementById('searchResultContainer');
    if (!container) return;

    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const subFilter = document.getElementById('searchSubjectSelect')?.value || 'all';
    const yrFilter = document.getElementById('searchYearSelect')?.value || 'all';

    let filtered = allQuestions.filter(q => {
      if (subFilter !== 'all' && q.subject !== subFilter) return false;
      if (yrFilter !== 'all' && String(q.year) !== yrFilter) return false;
      if (query) {
        return q.content.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          String(q.year).includes(query);
      }
      return true;
    });

    const countBadge = document.getElementById('searchCountBadge');
    if (countBadge) {
      countBadge.innerText = `找到 ${filtered.length} 題`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>未找到相符題目</h3>
          <p>請嘗試其他關鍵字（例如：「抵押權」、「區段徵收」、「折現率」）或放寬篩選條件。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.slice(0, 50).map((q, idx) => {
      const isFav = favorites.has(q.id);
      return `
        <div class="question-item">
          <div class="question-header">
            <div class="question-title-area">
              <span class="q-badge-year">民國 ${q.year} 年 (${q.year_ad})</span>
              <span class="q-badge-pts">${q.subject}</span>
              <span class="q-badge-pts">〔 ${q.points} 分 〕</span>
            </div>
            <div class="question-item-actions">
              <button class="btn-q-action ${isFav ? 'active' : ''}" onclick="toggleFav('${q.id}')">
                ${isFav ? '★ 已收藏' : '☆ 收藏'}
              </button>
              <a class="btn-q-action" href="https://www.google.com/search?q=${encodeURIComponent('不動產估價師 ' + q.year + '年 ' + q.subject + ' ' + q.title.slice(0, 25) + ' 擬答')}" target="_blank" rel="noopener">
                網路檢索
              </a>
            </div>
          </div>
          <div class="question-body">${highlightText(escapeHtml(q.content), query)}</div>
        </div>
      `;
    }).join('') + (filtered.length > 50 ? `<div style="text-align:center; padding: 12px; color: var(--text-muted);">僅顯示前 50 筆結果，請精確關鍵字...</div>` : '');
  };"""

new_render_search = """  // Search & Bank Browser
  window.renderSearchList = function () {
    const container = document.getElementById('searchResultContainer');
    if (!container) return;

    const query = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const subFilter = document.getElementById('searchSubjectSelect')?.value || 'all';
    const yrFilter = document.getElementById('searchYearSelect')?.value || 'all';
    const sortOrder = document.getElementById('searchSortSelect')?.value || 'yearDesc';

    let filtered = allQuestions.filter(q => {
      if (subFilter !== 'all' && q.subject !== subFilter) return false;
      if (yrFilter !== 'all' && String(q.year) !== yrFilter) return false;
      if (query) {
        return q.content.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          String(q.year).includes(query);
      }
      return true;
    });

    // 預設最新年度考題排序在前 (114 -> 91)，同年度依科目排序
    filtered.sort((a, b) => {
      if (sortOrder === 'yearAsc') {
        return (a.year - b.year) || (a.subject.localeCompare(b.subject, 'zh-Hant'));
      }
      return (b.year - a.year) || (a.subject.localeCompare(b.subject, 'zh-Hant'));
    });

    const countBadge = document.getElementById('searchCountBadge');
    if (countBadge) {
      countBadge.innerText = `找到 ${filtered.length} 題`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>未找到相符題目</h3>
          <p>請嘗試其他關鍵字（例如：「抵押權」、「市地重劃」、「折現率」）或放寬篩選條件。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.slice(0, 50).map((q, idx) => {
      const isFav = favorites.has(q.id);
      const isDrawerOpen = openAnswerDrawers.has(q.id);
      return `
        <div class="question-item" id="search-q-${q.id}">
          <div class="question-header">
            <div class="question-title-area">
              <span class="q-badge-year">民國 ${q.year} 年 (${q.year_ad})</span>
              <span class="q-badge-pts">${q.subject}</span>
              <span class="q-badge-pts">〔 ${q.points} 分 〕</span>
            </div>
            <div class="question-item-actions">
              <button class="btn-q-action ${isDrawerOpen ? 'active' : ''}" onclick="toggleAnswerDrawer('${q.id}', null)" title="展開/收合高點、公職王、陳翰基三版解答">
                ${isDrawerOpen ? '收合解答' : '📖 參考解答 (三版)'}
              </button>
              <button class="btn-q-action ${isFav ? 'active' : ''}" onclick="toggleFav('${q.id}')" title="收藏題目">
                ${isFav ? '★ 已收藏' : '☆ 收藏'}
              </button>
              <a class="btn-q-action" href="https://www.google.com/search?q=${encodeURIComponent('不動產估價師 ' + q.year + '年 ' + q.subject + ' ' + q.title.slice(0, 25) + ' 擬答')}" target="_blank" rel="noopener" title="Google 檢索">
                網路檢索
              </a>
            </div>
          </div>
          <div class="question-body">${highlightText(escapeHtml(q.content), query)}</div>
          ${isDrawerOpen ? renderAnswerDrawerHtml(q, null) : ''}
        </div>
      `;
    }).join('') + (filtered.length > 50 ? `<div style="text-align:center; padding: 12px; color: var(--text-muted); font-size:0.85rem;">已依最新年度排序顯示前 50 筆結果，輸入關鍵字可進一步精確查找...</div>` : '');
  };"""

if old_render_search in content:
    content = content.replace(old_render_search, new_render_search)
else:
    print("Warning: old_render_search not found exactly, will check regex")

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('app.js updated successfully!')

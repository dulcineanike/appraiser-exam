// 不動產估價師歷屆考題・模擬考卷生成系統
// App Core Logic (日系簡約風格 + AI法規擬答＆補習班解答系統)

(function () {
  'use strict';

  // Constants
  const CHINESE_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '二十一', '二十二', '二十三', '二十四'];

  const PROFESSIONAL_SUBJECTS = [
    '民法物權與不動產法規',
    '土地利用法規',
    '不動產投資分析',
    '不動產經濟學',
    '不動產估價理論',
    '不動產估價實務'
  ];

  const ALL_SUBJECTS = [
    ...PROFESSIONAL_SUBJECTS,
    '國文',
    '中華民國憲法'
  ];

  // State
  let allQuestions = [];
  let allAnswers = {};
  let currentTab = 'search';
  let selectedSubjects = [...PROFESSIONAL_SUBJECTS];
  let questionCount = 4;
  let yearRange = 'all'; // 'all', 'recent10', 'recent5', or custom
  let blindMode = false;
  let currentExam = null;

  // Answer Drawer State
  let openAnswerDrawers = new Set();
  let activeAnswerTabs = {}; // { [qId]: 'ai' | 'cram' }

  // Custom Cram Answers from user's textbook
  let customCramAnswers = {};
  try {
    customCramAnswers = JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}');
  } catch (e) {
    customCramAnswers = {};
  }

  // Favorites & Notes Storage
  let favorites = new Set();
  try {
    const savedFavs = JSON.parse(localStorage.getItem('appraiser_favs') || '[]');
    favorites = new Set(savedFavs);
  } catch (e) {
    favorites = new Set();
  }

  let notes = {};
  try {
    notes = JSON.parse(localStorage.getItem('appraiser_notes') || '{}');
  } catch (e) {
    notes = {};
  }

  // Timer State
  let timerSeconds = 7200; // 2 hours
  let timerRunning = false;
  let timerInterval = null;

  // Init Data
  function initData() {
    // 1. Load Questions
    if (window.EXAM_QUESTIONS && Array.isArray(window.EXAM_QUESTIONS)) {
      allQuestions = window.EXAM_QUESTIONS;
    }

    // 2. Load Answers Database
    if (window.EXAM_ANSWERS && typeof window.EXAM_ANSWERS === 'object') {
      allAnswers = window.EXAM_ANSWERS;
    }
    // Merge any custom local answers
    try {
      const customAns = JSON.parse(localStorage.getItem('appraiser_custom_answers') || '{}');
      allAnswers = { ...allAnswers, ...customAns };
    } catch (e) {}

    renderInitialView();
  }

  function renderInitialView() {
    updateSubjectPills();
    updateStatsView();
    // Default preset: generate Civil Law 4 questions
    generateExam(selectedSubjects, 4, 'all', false);
    switchTab('search');
  }

  // UI Theme
  window.toggleTheme = function () {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('appraiser_theme', 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('appraiser_theme', 'dark');
    }
  };

  // Font Size Management (預設為舒適大字模式，解決閱讀吃力)
  let currentFontSize = localStorage.getItem('appraiser_font_size') || 'large'; // 'large' (default) | 'xlarge' | 'standard'

  function applyFontSize(size, showToast = false) {
    currentFontSize = size;
    localStorage.setItem('appraiser_font_size', size);

    if (size === 'xlarge') {
      document.documentElement.setAttribute('data-font-size', 'xlarge');
    } else if (size === 'standard') {
      document.documentElement.setAttribute('data-font-size', 'standard');
    } else {
      document.documentElement.removeAttribute('data-font-size'); // default: large (舒適大字)
    }

    const btn = document.getElementById('fontSizeBtn');
    if (btn) {
      const labels = {
        large: '大字（舒適版）',
        xlarge: '特大（超清晰護眼）',
        standard: '標準'
      };
      btn.setAttribute('title', `調整字體大小（目前：${labels[size] || '大字'}，點擊切換）`);
    }

    if (showToast) {
      const msgs = {
        large: '🔤 已切換至：舒適大字模式 (預設清晰)',
        xlarge: '🔍 已切換至：特大護眼模式 (超清晰)',
        standard: '📄 已切換至：標準字體模式'
      };
      showToastMessage(msgs[size] || '字體大小已更新');
    }
  }

  window.cycleFontSize = function () {
    const nextMap = {
      large: 'xlarge',
      xlarge: 'standard',
      standard: 'large'
    };
    const nextSize = nextMap[currentFontSize] || 'large';
    applyFontSize(nextSize, true);
  };

  function showToastMessage(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // Restore saved theme and font size
  if (localStorage.getItem('appraiser_theme') === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
  }
  applyFontSize(currentFontSize, false);

  // Navigation Tabs
  window.switchTab = function (tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(view => {
      view.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) {
      targetView.style.display = 'block';
    }

    if (tabName === 'search') {
      renderSearchList();
    } else if (tabName === 'statuteMap') {
      renderStatuteMapView();
    } else if (tabName === 'favorites') {
      renderFavoritesList();
    } else if (tabName === 'stats') {
      updateStatsView();
    }
  };

  // Subject Pills UI in Generator
  function updateSubjectPills() {
    const container = document.getElementById('subjectPills');
    if (!container) return;
    container.innerHTML = ALL_SUBJECTS.map(sub => {
      const active = selectedSubjects.includes(sub) ? 'active' : '';
      return `<div class="subject-pill ${active}" onclick="toggleSubject('${sub}')">${sub}</div>`;
    }).join('');
  }

  window.toggleSubject = function (sub) {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        selectedSubjects = selectedSubjects.filter(s => s !== sub);
      }
    } else {
      selectedSubjects.push(sub);
    }
    updateSubjectPills();
  };

  window.selectSingleSubject = function (sub) {
    selectedSubjects = [sub];
    updateSubjectPills();
  };

  window.selectAllProfessional = function () {
    selectedSubjects = [...PROFESSIONAL_SUBJECTS];
    updateSubjectPills();
  };

  // Random Exam Generation Logic
  window.generateExam = function (subjects, count, yrRange, autoSwitch = true) {
    subjects = subjects || selectedSubjects;
    count = count || parseInt(document.getElementById('qCountInput')?.value || questionCount);
    yrRange = yrRange || document.getElementById('yearRangeSelect')?.value || yearRange;

    // Filter candidate questions
    let candidates = allQuestions.filter(q => subjects.includes(q.subject));

    if (yrRange === 'recent5') {
      candidates = candidates.filter(q => q.year >= 111);
    } else if (yrRange === 'recent10') {
      candidates = candidates.filter(q => q.year >= 106);
    } else if (yrRange === 'recent15') {
      candidates = candidates.filter(q => q.year >= 101);
    }

    if (candidates.length === 0) {
      alert('所選條件下無相符題目，請放寬篩選範圍！');
      return;
    }

    // Shuffle and pick
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(count, shuffled.length));

    // Reset open drawers
    openAnswerDrawers.clear();

    // Format into current exam
    const isSingle = subjects.length === 1;
    const examSubjectTitle = isSingle ? subjects[0] : (subjects.length === PROFESSIONAL_SUBJECTS.length ? '專業科目全真綜合模擬考' : subjects.join('、'));

    currentExam = {
      title: `專門職業及技術人員高等考試不動產估價師模擬試卷`,
      subject: examSubjectTitle,
      timeLimit: isSingle ? '2 小時' : `${Math.ceil(picked.length / 4) * 2} 小時`,
      totalPoints: picked.reduce((acc, q) => acc + (q.points || 25), 0),
      createdAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      questions: picked.map((q, idx) => ({
        ...q,
        displayNo: CHINESE_NUMS[idx] || `${idx + 1}`,
        isBlindRevealed: false
      }))
    };

    renderExamPaper();
    resetTimer(isSingle ? 7200 : Math.ceil(picked.length / 4) * 7200);

    if (autoSwitch) {
      switchTab('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Fast Presets
  window.quickPreset = function (type) {
    if (type === 'civil4') {
      selectSingleSubject('民法物權與不動產法規');
      generateExam(['民法物權與不動產法規'], 4, 'all', true);
    } else if (type === 'landuse4') {
      selectSingleSubject('土地利用法規');
      generateExam(['土地利用法規'], 4, 'all', true);
    } else if (type === 'appraisal4') {
      selectSingleSubject('不動產估價理論');
      generateExam(['不動產估價理論'], 4, 'all', true);
    } else if (type === 'practice2') {
      selectSingleSubject('不動產估價實務');
      generateExam(['不動產估價實務'], 2, 'all', true);
    } else if (type === 'econ4') {
      selectSingleSubject('不動產經濟學');
      generateExam(['不動產經濟學'], 4, 'all', true);
    } else if (type === 'invest4') {
      selectSingleSubject('不動產投資分析');
      generateExam(['不動產投資分析'], 4, 'all', true);
    } else if (type === 'full6') {
      let fullQs = [];
      PROFESSIONAL_SUBJECTS.forEach(sub => {
        let subPool = allQuestions.filter(q => q.subject === sub);
        let shuffled = [...subPool].sort(() => 0.5 - Math.random()).slice(0, 4);
        fullQs = fullQs.concat(shuffled);
      });
      openAnswerDrawers.clear();
      currentExam = {
        title: `專門職業及技術人員高等考試不動產估價師全真模擬試卷`,
        subject: '專業科目六科完整全真模擬試卷（共 24 題）',
        timeLimit: '2 天完整模擬',
        totalPoints: fullQs.reduce((acc, q) => acc + (q.points || 25), 0),
        createdAt: new Date().toLocaleString('zh-TW', { hour12: false }),
        questions: fullQs.map((q, idx) => ({
          ...q,
          displayNo: CHINESE_NUMS[idx] || `${idx + 1}`,
          isBlindRevealed: false
        }))
      };
      renderExamPaper();
      resetTimer(7200 * 6);
      switchTab('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (type === 'daily1') {
      let pool = allQuestions.filter(q => PROFESSIONAL_SUBJECTS.includes(q.subject));
      let randQ = pool[Math.floor(Math.random() * pool.length)];
      openAnswerDrawers.clear();
      currentExam = {
        title: `每日一練・不動產估價師即時精練題`,
        subject: randQ.subject,
        timeLimit: '30 分鐘',
        totalPoints: randQ.points || 25,
        createdAt: new Date().toLocaleString('zh-TW', { hour12: false }),
        questions: [{
          ...randQ,
          displayNo: '一',
          isBlindRevealed: false
        }]
      };
      renderExamPaper();
      resetTimer(1800);
      switchTab('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Render Exam Paper
  function renderExamPaper() {
    const container = document.getElementById('examPaperContainer');
    if (!container || !currentExam) return;

    const blindChecked = document.getElementById('blindModeToggle')?.checked || false;

    let html = `
      <div class="exam-paper">
        <div class="paper-header">
          <div class="paper-title">${currentExam.title}</div>
          <div class="paper-meta">
            <span>類科：不動產估價師</span>
            <span>科目：<strong>${currentExam.subject}</strong></span>
            <span>考試時間：${currentExam.timeLimit}</span>
            <span>總分：${currentExam.totalPoints} 分</span>
          </div>
        </div>

        <div class="paper-instructions">
          <strong>※ 注意事項：</strong>
          ㈠ 不必抄題，作答時請將試題題號及答案依照順序寫在答案卷上。<br>
          ㈡ 本測驗為考選部歷屆考古題隨機抽選組合之全真模擬試卷。<br>
          ㈢ 建議手寫作答時使用黑色或藍色原子筆／鋼筆，以達最佳實戰演練效果。
        </div>

        <div class="question-list">
    `;

    currentExam.questions.forEach((q, idx) => {
      const isFav = favorites.has(q.id);
      const isBlind = blindChecked && !q.isBlindRevealed;
      const noteText = notes[q.id] || '';
      const isDrawerOpen = openAnswerDrawers.has(q.id);

      html += `
        <div class="question-item" id="q-item-${idx}">
          <div class="question-header">
            <div class="question-title-area">
              <span class="q-badge-num">第 ${q.displayNo} 題</span>
              <span class="q-badge-pts">〔 ${q.points} 分 〕</span>
              ${isBlind
                ? `<span class="q-badge-blind" onclick="revealQuestionYear(${idx})">封印中・點擊揭曉</span>`
                : `<span class="q-badge-year">民國 ${q.year} 年 (${q.year_ad}) ・ ${q.subject}</span>`
              }
            </div>
            <div class="question-item-actions">
              <button class="btn-q-action ${isFav ? 'active' : ''}" onclick="toggleFav('${q.id}')" title="收藏題目">
                ${isFav ? '★ 已收藏' : '☆ 收藏'}
              </button>
              <button class="btn-q-action ${isDrawerOpen ? 'active' : ''}" onclick="toggleAnswerDrawer('${q.id}', ${idx})" title="查看 AI 專家法規擬答 ＆ 補習班參考解答">
                ${isDrawerOpen ? '收合解答' : '📖 參考解答 (AI/補習班)'}
              </button>
              <a class="btn-q-action" href="https://www.google.com/search?q=${encodeURIComponent('不動產估價師 ' + q.year + '年 ' + q.subject + ' ' + q.title.slice(0, 25) + ' 擬答')}" target="_blank" rel="noopener" title="在 Google 搜尋名師參考擬答">
                網路檢索
              </a>
              <button class="btn-q-action" onclick="rerollSingleQuestion(${idx})" title="隨機換一題">
                換題
              </button>
              <button class="btn-q-action" onclick="toggleScratchpad(${idx})" title="擬答大綱筆記">
                筆記
              </button>
            </div>
          </div>

          <div class="question-body">${escapeHtml(q.content)}</div>

          <!-- Three-Version Answer Drawer -->
          ${isDrawerOpen ? renderAnswerDrawerHtml(q, idx) : ''}

          <div class="print-handwriting-lines"></div>

          <div class="scratchpad-container" id="scratchpad-${idx}" style="display: ${noteText ? 'block' : 'none'};">
            <div class="scratchpad-header">
              <span>擬答大綱與重點條號（各取重點濃縮區）</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">本機自動保存</span>
            </div>
            <textarea class="scratchpad-textarea" 
              placeholder="記錄解題大綱、精華論點、相關法條（如民法第758條、平均地權條例第62條）、核心關鍵字..."
              oninput="handleNoteInput('${q.id}', this.value)">${escapeHtml(noteText)}</textarea>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Render Dual-Track Answer Drawer (AI Legal Answer & Cram School Answer)
  function renderAnswerDrawerHtml(q, idx) {
    const ansData = allAnswers[q.id];
    const activeTab = activeAnswerTabs[q.id] || 'ai';
    const userCustomCram = customCramAnswers[q.id];

    if (!ansData) {
      return `
        <div class="answer-drawer">
          <div style="font-size:0.85rem; color:var(--text-muted); padding:10px 0;">
            尚未收錄本題詳細解答，建議點擊上方「網路檢索」在 Google 查詢，或點擊下方筆記自行記錄。
          </div>
        </div>
      `;
    }

    const ai = ansData.ai_solution;
    const cram = ansData.cram_solution || {};

    let contentHtml = '';

    if (activeTab === 'ai') {
      // TRACK 1: AI Legal Answer (Clean 2-part structure: 1.擬答, 2.參考條文)
      contentHtml = `
        <div class="ai-header-bar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid var(--border-line);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="ai-badge">🤖 AI 精煉擬答</span>
            <span style="font-size:0.82rem; color:var(--text-muted);">依全國法規資料庫現行最新條文校準</span>
          </div>
          <span style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-subtle); padding:2px 8px; border-radius:2px; border:1px solid var(--border-line);">直指重點</span>
        </div>

        <!-- 1. 擬答 (AI寫的參考解答) -->
        <div class="ans-model-box" style="margin-bottom: 20px;">
          <div style="font-size:1.05rem; font-weight:700; color:var(--text-sumi); margin-bottom:12px; font-family:var(--font-serif);">
            1. 擬答：
          </div>
          <div class="ans-model-text">${formatModelSolution(ai.solution_outline || '')}</div>
        </div>

        <!-- 2. 參考條文 (法規與條文) -->
        ${ai.laws_referenced && ai.laws_referenced.length > 0 ? `
          <div class="statutes-card" style="margin-top: 18px;">
            <div style="font-size:1.05rem; font-weight:700; color:var(--text-sumi); margin-bottom:12px; font-family:var(--font-serif); padding-bottom:6px; border-bottom:1px dashed var(--border-line);">
              2. 參考條文：
            </div>
            ${ai.laws_referenced.map(law => `
              <div class="statute-item">
                <div class="statute-name">
                  <span style="font-weight: 700;">${escapeHtml(law.law_name)}</span>
                  <span class="statute-source">${escapeHtml(law.law_source)}</span>
                </div>
                <div class="statute-text">${escapeHtml(law.law_text)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    } else if (activeTab === 'cram') {
      // TRACK 2: Cram School Reference Answer
      if (userCustomCram) {
        // User has stored their own cram textbook answer locally
        contentHtml = `
          <div class="cram-custom-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span class="cram-source-badge">✎ 我的題庫書收錄解答（本機永久保存）</span>
              <div style="display:flex; gap:6px;">
                <button class="timer-btn" onclick="openCustomCramPrompt('${q.id}')">✎ 編輯</button>
                <button class="timer-btn" onclick="deleteCustomCram('${q.id}')">🗑️ 刪除</button>
              </div>
            </div>
            <div class="ans-model-text">${escapeHtml(userCustomCram)}</div>
          </div>
        `;
      } else if (cram && cram.verified) {
        // Verified authentic published cram solution
        contentHtml = `
          <div class="ans-info-row" style="margin-bottom:12px;">
            <div class="ans-teacher-title">
              <span class="cram-source-badge">🏫 ${escapeHtml(cram.cram_school || '補習班名師解析')}</span>
              <span class="cram-verified-tag">✓ 原廠專題評析</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted);">${escapeHtml(cram.source || '')}</div>
          </div>

          ${cram.core_laws && cram.core_laws.length ? `
            <div class="ans-laws-list">
              ${cram.core_laws.map(law => `<span class="ans-law-badge">§ ${escapeHtml(law)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="ans-keypoints-box" style="border-left: 4px solid #3e4f6b; margin-bottom: 16px;">
            <div class="ans-keypoints-title">
              <span>🎯 名師解題核心要點：</span>
            </div>
            ${(cram.key_points || []).map(pt => `
              <div class="ans-keypoint-item">
                <span>${escapeHtml(pt)}</span>
                <button class="btn-quote-point" onclick="copySinglePointToNote('${q.id}', ${idx}, '${escapeHtml(pt).replace(/'/g, "\\'")}')">+引</button>
              </div>
            `).join('')}
          </div>

          <div class="ans-model-box">
            <div style="font-size:0.92rem; font-weight:700; color:var(--text-sumi); margin-bottom:12px;">名師參考擬答：</div>
            <div class="ans-model-text">${escapeHtml(cram.solution_outline || '')}</div>
          </div>
        `;
      } else {
        // Uncollected State
        const googleQuery = encodeURIComponent(`不動產估價師 ${q.year}年 ${q.subject} ${q.title.slice(0, 20)} 解答 site:get.com.tw OR site:public.com.tw OR 擬答`);
        contentHtml = `
          <div class="cram-uncollected-box">
            <div class="cram-uncollected-icon">📖</div>
            <div class="cram-uncollected-title">本題尚未收錄補習班實體出版品授權解答</div>
            <div class="cram-uncollected-desc">
              目前全體題庫已收錄 <strong>3</strong> 題補習班公開專題評析（全庫收錄比例為 <strong>0.47%</strong>）。各大補習班（高點、公職王、首宇等）歷屆試題擬答受著作權法保護，多以實體題庫書（如許文昌老師《不動產估價師歷屆試題全解》每本約 600~900 元）或學員專用付費專區形式發行，網路上並無合法公開之全題庫解答 API。<br><br>
              本系統嚴格恪遵著作權法與真實原則，<strong>絕不虛構假冒名師解答</strong>。您可以點擊下方按鈕直接在 Google 檢索，或將手邊題庫書解答貼入本機永久保存！
            </div>
            <div class="cram-uncollected-actions">
              <a class="btn-primary" href="https://www.google.com/search?q=${googleQuery}" target="_blank" rel="noopener">
                🌐 一鍵 Google 檢索本題補習班解答 (高點/公職王/首宇)
              </a>
              <button class="btn-secondary" onclick="openCustomCramPrompt('${q.id}')">
                ✎ 貼入我手邊題庫書解答
              </button>
              <button class="btn-secondary" onclick="toggleScratchpad(${idx})">
                ✍️ 開啟我的答題筆記
              </button>
            </div>
          </div>
        `;
      }
    } else if (activeTab === 'community') {
      // TRACK 3: Community Notes & Peer Exchange (考友社群筆記)
      const commNotes = window.AppraiserMembership ? window.AppraiserMembership.getNotes(q.id) : [];
      const currentMember = window.AppraiserMembership ? window.AppraiserMembership.getProfile() : null;
      const currentRank = window.AppraiserMembership ? window.AppraiserMembership.getRank() : { title: '估價學徒', badge: '🐣' };

      contentHtml = `
        <div class="comm-notes-container">
          <div class="comm-notes-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; color:var(--text-sumi); font-size:1rem;">👥 考友解題心得與法規補充 (${commNotes.length})</span>
            </div>
            <div class="comm-reward-tip">
              ✍️ 分享解題筆記 +20 積分，獲讚再 +5 積分！
            </div>
          </div>

          <!-- Notes List -->
          <div class="comm-note-list">
            ${commNotes.length === 0 ? `
              <div style="text-align:center; padding:32px 16px; color:var(--text-muted); background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px dashed var(--border-line);">
                <div style="font-size:2rem; margin-bottom:8px;">💬</div>
                <div style="font-weight:600; font-size:0.95rem; margin-bottom:4px;">目前尚無考友留下公開筆記</div>
                <div style="font-size:0.83rem;">成為第一位留下破題口訣或實務提醒的估價先鋒吧！發布立即獲得 <strong>+20 貢獻積分</strong>！</div>
              </div>
            ` : commNotes.map(n => {
              const timeDisplay = n.createdAt ? new Date(n.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '近期';
              return `
                <div class="comm-note-card ${n.isFeatured ? 'featured' : ''}">
                  <div class="comm-note-author-row">
                    <div class="comm-author-info">
                      <span class="comm-author-name">${escapeHtml(n.authorName)}</span>
                      <span class="comm-rank-tag" style="color:var(--accent-indigo);">${escapeHtml(n.authorRank || '估價學徒')}</span>
                      ${n.isFeatured ? '<span class="comm-featured-tag">★ 精選擬答 (+50pt)</span>' : ''}
                    </div>
                    <span class="comm-time">${timeDisplay}</span>
                  </div>
                  <div class="comm-note-content">${escapeHtml(n.content)}</div>
                  <div class="comm-note-actions">
                    <button class="comm-upvote-btn" onclick="window.handleUpvoteCommunityNote('${n.id}', '${q.id}')" title="覺得有幫助，給予肯定點讚（作者獲 +5 積分）">
                      👍 認同 (${n.upvotes || 0})
                    </button>
                    <button class="btn-quote-point" onclick="copySinglePointToNote('${q.id}', ${idx}, '${escapeHtml(n.content).replace(/'/g, "\\'")}')" title="引用至本題私房草稿紙">
                      +引用至私房筆記
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- New Note Editor -->
          <div class="comm-editor-card">
            <div class="comm-editor-title">
              <span>✍️ 留下我的解題筆記與考點剖析</span>
              <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">發布人：${escapeHtml(currentMember ? currentMember.nickname : '匿名考友')} (${currentRank.badge} ${currentRank.title})</span>
            </div>
            <textarea id="comm-input-${q.id}" class="comm-editor-textarea" 
              placeholder="分享這題的關鍵字記憶法、答題盲點、最新函釋或公報補充（內容請至少 5 個字）..."></textarea>
            <div class="comm-editor-footer">
              <span style="font-size:0.8rem; color:var(--text-muted);">💡 優質筆記將常態公開，供全台考友共同切磋</span>
              <button class="comm-publish-btn" onclick="window.submitCommunityNote('${q.id}')">
                發布社群筆記 (+20 積分)
              </button>
            </div>
          </div>
        </div>
      `;
    }

    const commNotesCount = window.AppraiserMembership ? window.AppraiserMembership.getNotes(q.id).length : 0;

    return `
      <div class="answer-drawer" id="answer-drawer-${q.id}">
        <div class="answer-drawer-header">
          <div class="answer-tabs">
            <button class="ans-tab-btn ${activeTab === 'ai' ? 'active' : ''}" onclick="switchAnsTab('${q.id}', 'ai')">
              🤖 AI 精準擬答 (最新現行法規)
            </button>
            <button class="ans-tab-btn ${activeTab === 'cram' ? 'active' : ''}" onclick="switchAnsTab('${q.id}', 'cram')">
              🏫 補習班參考解答 ${userCustomCram ? '★' : (cram && cram.verified ? '✓' : '')}
            </button>
            <button class="ans-tab-btn ${activeTab === 'community' ? 'active' : ''}" onclick="switchAnsTab('${q.id}', 'community')">
              👥 考友社群筆記 (${commNotesCount})
            </button>
          </div>
          <div class="ans-actions">
            ${activeTab === 'ai' ? `
              <button class="timer-btn" onclick="copyAiPointsToNote('${q.id}', ${idx})" title="將 AI 擬答重點引用至下方筆記">
                ＋ 引用要點至筆記
              </button>
              <button class="timer-btn" onclick="toggleScratchpad(${idx})" title="展開/收合作答筆記紙">
                ✍️ 答題草稿紙
              </button>
            ` : activeTab === 'cram' ? `
              ${cram && cram.verified ? `
                <button class="timer-btn" onclick="copyCramPointsToNote('${q.id}', ${idx})" title="將補習班擬答要點引用至筆記">
                  ＋ 引用擬答要點
                </button>
              ` : ''}
              <button class="timer-btn" onclick="openCustomCramPrompt('${q.id}')" title="貼入或修改手邊題庫書解答">
                ✎ 貼入/編輯題庫書解答
              </button>
            ` : `
              <button class="timer-btn" onclick="document.getElementById('comm-input-${q.id}')?.focus()" title="直接撰寫考點分享">
                ✍️ 我要分享筆記 (+20pt)
              </button>
            `}
          </div>
        </div>

        ${contentHtml}
      </div>
    `;
  }

  // Answer Drawer Actions
  window.toggleAnswerDrawer = function (qId, idx) {
    if (openAnswerDrawers.has(qId)) {
      openAnswerDrawers.delete(qId);
    } else {
      openAnswerDrawers.add(qId);
      if (!activeAnswerTabs[qId]) {
        activeAnswerTabs[qId] = 'ai';
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
  };

  window.submitCommunityNote = function (qId) {
    const textarea = document.getElementById(`comm-input-${qId}`);
    if (!textarea) return;
    const content = textarea.value;
    if (window.AppraiserMembership) {
      const newNote = window.AppraiserMembership.addNote(qId, content);
      if (newNote) {
        textarea.value = '';
        if (currentTab === 'search') {
          renderSearchList();
        } else {
          renderExamPaper();
        }
      }
    }
  };

  window.handleUpvoteCommunityNote = function (noteId, qId) {
    if (window.AppraiserMembership) {
      const ok = window.AppraiserMembership.upvoteNote(noteId, qId);
      if (ok) {
        if (currentTab === 'search') {
          renderSearchList();
        } else {
          renderExamPaper();
        }
      }
    }
  };

  window.copySinglePointToNote = function (qId, idx, pointText) {
    let current = notes[qId] || '';
    current += (current ? '\n' : '') + `• ${pointText}`;
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

  window.copyAiPointsToNote = function (qId, idx) {
    const ansData = allAnswers[qId];
    if (!ansData || !ansData.ai_solution) return;
    const ai = ansData.ai_solution;
    let block = `【AI 專家法規擬答重點】\n` + (ai.key_points || []).map(p => `• ${p}`).join('\n');
    let current = notes[qId] || '';
    current += (current ? '\n\n' : '') + block;
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
      alert('已將 AI 擬答重點加入本題筆記，並已複製到剪貼簿！');
    }
  };

  window.copyCramPointsToNote = function (qId, idx) {
    const ansData = allAnswers[qId];
    if (!ansData || !ansData.cram_solution) return;
    const cram = ansData.cram_solution;
    let block = `【補習班參考重點・${cram.cram_school || ''}】\n` + (cram.key_points || []).map(p => `• ${p}`).join('\n');
    let current = notes[qId] || '';
    current += (current ? '\n\n' : '') + block;
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
      alert('已將補習班擬答重點加入本題筆記，並已複製到剪貼簿！');
    }
  };

  window.openCustomCramPrompt = function (qId) {
    const current = customCramAnswers[qId] || '';
    const newAnswer = prompt(
      `請貼入您手邊實體題庫書（如許文昌或公職王）針對本題之參考解答：`,
      current
    );
    if (newAnswer !== null) {
      const trimmed = newAnswer.trim();
      if (trimmed) {
        customCramAnswers[qId] = trimmed;
      } else {
        delete customCramAnswers[qId];
      }
      localStorage.setItem('appraiser_custom_cram', JSON.stringify(customCramAnswers));
      activeAnswerTabs[qId] = 'cram';
      if (currentTab === 'search') {
        renderSearchList();
      } else {
        renderExamPaper();
      }
    }
  };

  window.deleteCustomCram = function (qId) {
    if (confirm('確定要移除此本機收錄的題庫書解答嗎？')) {
      delete customCramAnswers[qId];
      localStorage.setItem('appraiser_custom_cram', JSON.stringify(customCramAnswers));
      if (currentTab === 'search') {
        renderSearchList();
      } else {
        renderExamPaper();
      }
    }
  };

  // Single Question Reroll
  window.rerollSingleQuestion = function (idx) {
    if (!currentExam || !currentExam.questions[idx]) return;
    const currentQ = currentExam.questions[idx];
    const pool = allQuestions.filter(q => q.subject === currentQ.subject && q.id !== currentQ.id);
    if (pool.length === 0) {
      alert('無其他可用考題供替換！');
      return;
    }
    const newQ = pool[Math.floor(Math.random() * pool.length)];
    currentExam.questions[idx] = {
      ...newQ,
      displayNo: currentQ.displayNo,
      isBlindRevealed: currentQ.isBlindRevealed
    };
    renderExamPaper();
  };

  window.revealQuestionYear = function (idx) {
    if (currentExam && currentExam.questions[idx]) {
      currentExam.questions[idx].isBlindRevealed = true;
      renderExamPaper();
    }
  };

  window.onBlindModeChange = function () {
    renderExamPaper();
  };

  // Scratchpad
  window.toggleScratchpad = function (idx) {
    const el = document.getElementById(`scratchpad-${idx}`);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
      if (el.style.display === 'block') {
        const textarea = el.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    }
  };

  window.handleNoteInput = function (qId, val) {
    notes[qId] = val;
    localStorage.setItem('appraiser_notes', JSON.stringify(notes));
  };

  // Favorites
  window.toggleFav = function (qId) {
    if (favorites.has(qId)) {
      favorites.delete(qId);
    } else {
      favorites.add(qId);
    }
    localStorage.setItem('appraiser_favs', JSON.stringify([...favorites]));
    if (currentTab === 'exam') {
      renderExamPaper();
    } else if (currentTab === 'favorites') {
      renderFavoritesList();
    } else if (currentTab === 'search') {
      renderSearchList();
    }
  };

  // Timer Functions
  function updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (!el) return;
    const hrs = Math.floor(timerSeconds / 3600);
    const mins = Math.floor((timerSeconds % 3600) / 60);
    const secs = timerSeconds % 60;
    const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    el.innerText = formatted;

    el.classList.remove('warning', 'danger');
    if (timerSeconds <= 300) {
      el.classList.add('danger');
    } else if (timerSeconds <= 900) {
      el.classList.add('warning');
    }
  }

  window.toggleTimer = function () {
    const btn = document.getElementById('timerToggleBtn');
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      if (btn) btn.innerText = '開始';
    } else {
      if (timerSeconds <= 0) timerSeconds = 7200;
      timerRunning = true;
      if (btn) btn.innerText = '暫停';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          updateTimerDisplay();
        } else {
          clearInterval(timerInterval);
          timerRunning = false;
          if (btn) btn.innerText = '開始';
          alert('⏰ 考試時間結束！請停筆交卷。');
        }
      }, 1000);
    }
  };

  window.resetTimer = function (secs = 7200) {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = secs;
    const btn = document.getElementById('timerToggleBtn');
    if (btn) btn.innerText = '開始';
    updateTimerDisplay();
  };

  window.submitExamPaper = function () {
    if (!currentExam) {
      alert('目前尚未生成考卷！');
      return;
    }
    // Stop timer
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      const btn = document.getElementById('timerToggleBtn');
      if (btn) btn.innerText = '開始';
    }

    // Reveal blind mode
    const blindToggle = document.getElementById('blindModeToggle');
    if (blindToggle && blindToggle.checked) {
      blindToggle.checked = false;
      if (typeof window.onBlindModeChange === 'function') {
        window.onBlindModeChange();
      }
    }

    // Award Points
    if (window.AppraiserMembership) {
      const prof = window.AppraiserMembership.getProfile();
      if (prof) {
        prof.examsCount = (prof.examsCount || 0) + 1;
      }
      window.AppraiserMembership.addPoints(10, '完成全真模擬考卷交卷');
    }

    alert('🎉 恭喜完成模擬考交卷！出題出處已揭曉，並已獲得 10 點貢獻積分！');
  };

  // Search & Bank Browser
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
              <button class="btn-q-action ${isDrawerOpen ? 'active' : ''}" onclick="toggleAnswerDrawer('${q.id}', null)" title="查看 AI 專家法規擬答 ＆ 補習班參考解答">
                ${isDrawerOpen ? '收合解答' : '📖 參考解答 (AI/補習班)'}
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
  };

  // Favorites List
  window.renderFavoritesList = function () {
    const container = document.getElementById('favoritesContainer');
    if (!container) return;

    const favQuestions = allQuestions.filter(q => favorites.has(q.id));
    const favBadge = document.getElementById('favCountBadge');
    if (favBadge) favBadge.innerText = `已收藏 ${favQuestions.length} 題`;

    if (favQuestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⭐</div>
          <h3>目前尚無收藏的題目</h3>
          <p>在產生考卷或題庫檢索時，點擊「☆ 收藏」即可將題目保存至此，供後續專項複習。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <p style="color:var(--text-muted); font-size:0.9rem;">您可以直接將收藏的題目組合成專屬模擬考卷：</p>
        <button class="btn-primary" onclick="generateFromFavorites()">🎯 以收藏題目組卷</button>
      </div>
      <div class="question-list">
        ${favQuestions.map(q => {
          const noteText = notes[q.id] || '';
          return `
            <div class="question-item">
              <div class="question-header">
                <div class="question-title-area">
                  <span class="q-badge-year">民國 ${q.year} 年</span>
                  <span class="q-badge-pts">${q.subject}</span>
                  <span class="q-badge-pts">〔 ${q.points} 分 〕</span>
                </div>
                <div class="question-item-actions">
                  <button class="btn-q-action active" onclick="toggleFav('${q.id}')">
                    ★ 取消收藏
                  </button>
                </div>
              </div>
              <div class="question-body">${escapeHtml(q.content)}</div>
              ${noteText ? `<div style="background:var(--bg-washi); border:1px solid var(--border-line); padding:10px 14px; border-radius:4px; font-size:0.86rem; color:var(--text-body); margin-top:10px;"><strong>我的筆記：</strong><br>${escapeHtml(noteText)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  window.generateFromFavorites = function () {
    const favQuestions = allQuestions.filter(q => favorites.has(q.id));
    if (favQuestions.length === 0) return;

    openAnswerDrawers.clear();
    currentExam = {
      title: `專門職業及技術人員高等考試不動產估價師個人錯題精選模擬試卷`,
      subject: '個人精選收藏考題複習卷',
      timeLimit: `${Math.ceil(favQuestions.length / 4) * 2} 小時`,
      totalPoints: favQuestions.reduce((acc, q) => acc + (q.points || 25), 0),
      createdAt: new Date().toLocaleString('zh-TW', { hour12: false }),
      questions: favQuestions.map((q, idx) => ({
        ...q,
        displayNo: CHINESE_NUMS[idx] || `${idx + 1}`,
        isBlindRevealed: false
      }))
    };
    renderExamPaper();
    resetTimer(Math.ceil(favQuestions.length / 4) * 7200);
    switchTab('exam');
  };

  // Stats View
  function updateStatsView() {
    const container = document.getElementById('statsContainer');
    if (!container) return;

    const subCounts = {};
    const yrCounts = {};
    allQuestions.forEach(q => {
      subCounts[q.subject] = (subCounts[q.subject] || 0) + 1;
      yrCounts[q.year] = (yrCounts[q.year] || 0) + 1;
    });

    const yearsList = Object.keys(yrCounts).map(Number).sort((a, b) => a - b);
    const minYr = yearsList.length ? yearsList[0] : 91;
    const maxYr = yearsList.length ? yearsList[yearsList.length - 1] : 115;
    const totalYrs = yearsList.length;

    let verifiedCramCount = 0;
    Object.values(allAnswers).forEach(ans => {
      if (ans && ans.cram_solution && ans.cram_solution.verified) {
        verifiedCramCount++;
      }
    });
    const totalQ = allQuestions.length || 1;
    const cramPct = ((verifiedCramCount / totalQ) * 100).toFixed(2);
    const userCramCount = Object.keys(customCramAnswers).length;

    let html = `
      <div class="config-card">
        <h3 style="font-family:var(--font-serif); margin-bottom:18px; font-size:1.1rem; color:var(--text-sumi); letter-spacing:0.06em;">題庫總體概況</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:28px;">
          <div style="background:var(--bg-washi); padding:18px 20px; border-radius:var(--radius-sm); border:1px solid var(--border-line);">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">收錄總題數</div>
            <div style="font-family:var(--font-serif); font-size:1.75rem; font-weight:700; color:var(--text-sumi);">${allQuestions.length} <span style="font-size:0.9rem; font-weight:normal;">題</span></div>
          </div>
          <div style="background:var(--bg-washi); padding:18px 20px; border-radius:var(--radius-sm); border:1px solid var(--border-line);">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">涵蓋年份</div>
            <div style="font-family:var(--font-serif); font-size:1.75rem; font-weight:700; color:var(--text-sumi);">${minYr}～${maxYr} <span style="font-size:0.9rem; font-weight:normal;">年 (共${totalYrs}年)</span></div>
          </div>
          <div style="background:var(--bg-washi); padding:18px 20px; border-radius:var(--radius-sm); border:1px solid var(--border-line);">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">雙軌解答系統規格</div>
            <div style="font-family:var(--font-serif); font-size:1.25rem; font-weight:700; color:var(--accent-bamboo);">AI 法規精煉 ＆ 補習班對照</div>
          </div>
        </div>

        <h3 style="font-family:var(--font-serif); margin-bottom:14px; font-size:1.02rem; color:var(--text-sumi); letter-spacing:0.05em;">解答庫收錄來源與覆蓋比例</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:28px;">
          <div style="background:var(--bg-card); border:1px solid var(--border-line); border-left:4px solid var(--accent-bamboo); padding:16px 18px; border-radius:var(--radius-sm);">
            <div style="font-weight:700; color:var(--accent-bamboo); font-size:0.92rem; margin-bottom:4px;">🤖 AI 精煉法規擬答</div>
            <div style="font-size:1.45rem; font-weight:700; font-family:var(--font-serif); color:var(--text-sumi);">${allQuestions.length} 題 <span style="font-size:0.9rem; font-weight:normal; color:var(--text-muted);">(100.0%)</span></div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">依全國法規資料庫現行最新條文撰寫，直截去蕪存菁，標準條列</div>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-line); border-left:4px solid #3e4f6b; padding:16px 18px; border-radius:var(--radius-sm);">
            <div style="font-weight:700; color:#3e4f6b; font-size:0.92rem; margin-bottom:4px;">🏫 補習班原廠授權解答</div>
            <div style="font-family:var(--font-serif); font-size:1.45rem; font-weight:700; color:var(--text-sumi);">${verifiedCramCount} 題 <span style="font-size:0.9rem; font-weight:normal; color:var(--text-muted);">(${cramPct}%)</span></div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">查證公開授權專題評析，恪遵真實性，絕不偽造補習班名師解析</div>
          </div>
          <div style="background:var(--bg-card); border:1px solid var(--border-line); border-left:4px solid var(--accent-vermilion); padding:16px 18px; border-radius:var(--radius-sm);">
            <div style="font-weight:700; color:var(--accent-vermilion); font-size:0.92rem; margin-bottom:4px;">✎ 自訂實體題庫書筆記</div>
            <div style="font-family:var(--font-serif); font-size:1.45rem; font-weight:700; color:var(--text-sumi);">${userCramCount} 題</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">由您手動貼入個人實體書解答，儲存於本機瀏覽器，永久可用</div>
          </div>
        </div>
        <div style="background:var(--bg-washi); border:1px dashed var(--border-line); padding:14px 18px; border-radius:var(--radius-sm); font-size:0.84rem; color:var(--text-muted); line-height:1.8; margin-bottom:28px;">
          📌 <strong>補習班解答現狀說明：</strong><br>
          各大補習班（高點、公職王、首宇等）之歷屆試題擬答受著作權法保護，多以實體題庫書（如許文昌老師《不動產估價師歷屆試題全解》每本約 600~900 元）或付費學員專區形式發行，網路上並無合法公開之全題庫解答 API。本系統堅持 100% 誠信原則，提供 Google 一鍵檢索與貼入實體書解答之完整支援。
        </div>

        <h3 style="font-family:var(--font-serif); margin-bottom:14px; font-size:1.02rem; color:var(--text-sumi); letter-spacing:0.05em;">各科目題數分佈</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; margin-bottom:28px;">
          ${Object.entries(subCounts).sort((a,b) => b[1]-a[1]).map(([sub, count]) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:var(--bg-washi); border-radius:var(--radius-sm); border:1px solid var(--border-line); font-size:0.88rem;">
              <span>${sub}</span>
              <span style="font-weight:600; color:var(--text-sumi); font-family:var(--font-serif);">${count} 題</span>
            </div>
          `).join('')}
        </div>

        <h3 style="font-family:var(--font-serif); margin-bottom:14px; font-size:1.02rem; color:var(--text-sumi); letter-spacing:0.05em;">各年度收錄分佈</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:8px;">
          ${Object.keys(yrCounts).sort((a,b)=>a-b).map(yr => `
            <div style="text-align:center; padding:8px 6px; background:var(--bg-washi); border-radius:var(--radius-sm); border:1px solid var(--border-line); font-size:0.8rem;">
              <div style="color:var(--text-muted);">${yr} 年 (${parseInt(yr)+1911})</div>
              <strong style="color:var(--text-sumi); font-family:var(--font-serif);">${yrCounts[yr]} 題</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Export Exam
  window.printExam = function () {
    window.print();
  };

  window.exportExamTxt = function () {
    if (!currentExam) return;
    let txt = `=====================================================\n`;
    txt += `${currentExam.title}\n`;
    txt += `科目：${currentExam.subject} | 時間：${currentExam.timeLimit} | 總分：${currentExam.totalPoints} 分\n`;
    txt += `產卷時間：${currentExam.createdAt}\n`;
    txt += `=====================================================\n\n`;

    currentExam.questions.forEach((q, idx) => {
      txt += `第 ${q.displayNo} 題 (${q.points} 分) [出處：民國 ${q.year} 年 ${q.subject}]\n`;
      txt += `${q.content}\n\n`;
      const note = notes[q.id];
      if (note) {
        txt += `【我的擬答大綱與精華筆記】\n${note}\n\n`;
      }
      const ansData = allAnswers[q.id];
      const customCram = customCramAnswers[q.id];
      if (ansData) {
        if (ansData.ai_solution) {
          txt += `【AI 專家法規擬答（全國法規資料庫最新現行條文對照）】\n`;
          txt += `答題要點：\n${(ansData.ai_solution.key_points || []).join('\n')}\n\n`;
          txt += `${ansData.ai_solution.solution_outline || ''}\n\n`;
        }
        if (customCram) {
          txt += `【我的題庫書收錄解答（本機筆記）】\n${customCram}\n\n`;
        } else if (ansData.cram_solution && ansData.cram_solution.verified) {
          txt += `【補習班參考擬答】(來源：${ansData.cram_solution.source || '名師專題評析'})\n`;
          txt += `${ansData.cram_solution.solution_outline || ''}\n\n`;
        }
      }
      txt += `-----------------------------------------------------\n\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `估價師模擬考卷_${currentExam.subject.slice(0, 10)}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // TAB 6: 法條考題地圖 (Statute Map) Logic
  // ==========================================
  window.renderStatuteMapView = function () {
    const container = document.getElementById('statuteMapContainer');
    const banner = document.getElementById('statuteMapSummaryBanner');
    if (!container) return;

    const searchTerm = (document.getElementById('statuteSearchInput')?.value || '').trim().toLowerCase();
    const categoryFilter = document.getElementById('statuteCategorySelect')?.value || 'all';

    // 1. Build statute -> questions map
    const statuteMap = {};
    allQuestions.forEach(q => {
      const ans = allAnswers[q.id];
      const laws = ans?.ai_solution?.laws_referenced || [];
      laws.forEach(law => {
        const key = law.law_name;
        if (!statuteMap[key]) {
          statuteMap[key] = {
            name: law.law_name,
            source: law.law_source || '全國法規資料庫 (law.moj.gov.tw)',
            text: law.law_text || '',
            questions: []
          };
        }
        statuteMap[key].questions.push(q);
      });
    });

    // 2. Sort by frequency descending
    let statutesList = Object.values(statuteMap).sort((a, b) => b.questions.length - a.questions.length);

    // 3. Filter by category
    if (categoryFilter !== 'all') {
      statutesList = statutesList.filter(s => {
        if (categoryFilter === '技術規則') return s.name.includes('不動產估價技術規則');
        if (categoryFilter === '民法') return s.name.includes('民法');
        if (categoryFilter === '土地法') return s.name.includes('土地法') || s.name.includes('平均地權');
        if (categoryFilter === '土地利用') return s.name.includes('國土計畫') || s.name.includes('都市計畫') || s.name.includes('都市更新') || s.name.includes('土地徵收');
        if (categoryFilter === '土地稅法') return s.name.includes('土地稅') || s.name.includes('稅');
        if (categoryFilter === '公報裁判') return s.name.includes('公報') || s.name.includes('裁定') || s.name.includes('釋字') || s.name.includes('院字');
        return true;
      });
    }

    // 4. Filter by search term
    if (searchTerm) {
      statutesList = statutesList.filter(s => {
        const inName = s.name.toLowerCase().includes(searchTerm);
        const inText = s.text.toLowerCase().includes(searchTerm);
        const inQuestions = s.questions.some(q => q.title.toLowerCase().includes(searchTerm) || (q.year + '').includes(searchTerm));
        return inName || inText || inQuestions;
      });
    }

    // Render Banner
    if (banner) {
      const totalStatutes = Object.keys(statuteMap).length;
      const totalQuestionsWithLaws = allQuestions.filter(q => allAnswers[q.id]?.ai_solution?.laws_referenced?.length > 0).length;
      banner.innerHTML = `
        <div class="statute-summary-banner">
          <div>
            <div class="statute-summary-title">📜 歷屆國家考試・必備法規條文與考題對照矩陣</div>
            <div class="statute-summary-desc">已建立 ${totalStatutes} 組專技高考核心法規與條號，關聯 ${totalQuestionsWithLaws} 道試題（點擊條文展開查看歷屆考題）</div>
          </div>
          <div style="font-size:0.92rem; font-weight:700; color:var(--accent-indigo);">
            目前符合條件：共 ${statutesList.length} 條法規
          </div>
        </div>
      `;
    }

    if (statutesList.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center; padding:40px; color:var(--text-muted);">
          <div style="font-size:2rem; margin-bottom:12px;">🔍</div>
          <div>未找到相符的法規或條號，請嘗試調整搜尋關鍵字！</div>
        </div>
      `;
      return;
    }

    container.innerHTML = statutesList.map((statute, idx) => {
      const cardId = 'statute-card-' + idx;
      let lawCategoryBadge = '法規條文';
      if (statute.name.includes('技術規則')) lawCategoryBadge = '估價技術規則';
      else if (statute.name.includes('民法')) lawCategoryBadge = '民法物權';
      else if (statute.name.includes('土地法') || statute.name.includes('平均地權')) lawCategoryBadge = '土地法規';
      else if (statute.name.includes('土地稅')) lawCategoryBadge = '土地稅法';
      else if (statute.name.includes('國土') || statute.name.includes('都市') || statute.name.includes('徵收')) lawCategoryBadge = '土地利用';
      else if (statute.name.includes('公報')) lawCategoryBadge = '公會專業公報';
      else if (statute.name.includes('裁定') || statute.name.includes('釋字') || statute.name.includes('院字')) lawCategoryBadge = '司法實務見解';

      const qRows = statute.questions.map(q => `
        <div class="statute-q-row">
          <div class="statute-q-meta">
            <span class="badge" style="background-color:var(--accent-indigo-bg); color:var(--accent-indigo); font-weight:700;">${q.year} 年</span>
            <span class="badge" style="background-color:var(--bg-subtle); color:var(--text-sumi);">${q.subject}</span>
            <span class="badge badge-points">${q.points || 25} 分</span>
          </div>
          <div class="statute-q-title-text" title="${escapeHtml(q.title)}">
            ${escapeHtml(q.title)}
          </div>
          <button class="statute-view-btn" onclick="openStatuteQuestion('${q.id}')">
            查看考題擬答 ➔
          </button>
        </div>
      `).join('');

      return `
        <div class="statute-card ${idx === 0 ? 'open' : ''}" id="${cardId}">
          <div class="statute-card-header" onclick="toggleStatuteCard('${cardId}')">
            <div class="statute-card-title-box">
              <span class="statute-law-badge">${lawCategoryBadge}</span>
              <span class="statute-law-title">${escapeHtml(statute.name)}</span>
            </div>
            <div class="statute-card-stats">
              <span class="statute-count-badge">🔥 歷屆共考 ${statute.questions.length} 題</span>
              <span class="statute-toggle-arrow">▼</span>
            </div>
          </div>
          <div class="statute-card-body">
            ${statute.text ? `
              <div style="font-size:0.86rem; font-weight:700; color:var(--text-muted); margin-top:12px;">【條文法定規範要旨】來源：${escapeHtml(statute.source)}</div>
              <div class="statute-text-display">${escapeHtml(statute.text)}</div>
            ` : ''}
            <div class="statute-questions-heading">
              <span>🎯 歷屆運用此條文之國家考試題目（共 ${statute.questions.length} 題）：</span>
            </div>
            <div class="statute-questions-list">
              ${qRows}
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  window.toggleStatuteCard = function (cardId) {
    const card = document.getElementById(cardId);
    if (card) {
      card.classList.toggle('open');
    }
  };

  window.openStatuteQuestion = function (qId) {
    switchTab('search');
    const q = allQuestions.find(x => x.id === qId);
    if (q) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = q.title.slice(0, 18);
      }
      const subjSelect = document.getElementById('searchSubjectSelect');
      if (subjSelect) subjSelect.value = 'all';
      const yrSelect = document.getElementById('searchYearSelect');
      if (yrSelect) yrSelect.value = 'all';
      openAnswerDrawers.add(qId);
      renderSearchList();
      setTimeout(() => {
        const drawer = document.getElementById('search-drawer-' + qId);
        if (drawer) {
          drawer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

  // Utilities
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightText(text, keyword) {
    if (!keyword) return text;
    const reg = new RegExp(`(${keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
    return text.replace(reg, '<mark style="background:#fef08a; padding:1px 4px; border-radius:3px;">$1</mark>');
  }

  function formatModelSolution(text) {
    if (!text) return '';
    let escaped = escapeHtml(text);
    escaped = escaped.replace(/【📈 考場實戰作圖指南】/g, '<span class="solution-highlight-badge badge-graph">📈 考場實戰作圖指南</span>');
    escaped = escaped.replace(/【📊 考場標準計算推導與試算步驟】/g, '<span class="solution-highlight-badge badge-calc">📊 考場標準計算推導與試算步驟</span>');
    escaped = escaped.replace(/【📊 財務模型推算與敏感度分析】/g, '<span class="solution-highlight-badge badge-calc">📊 財務模型推算與敏感度分析</span>');
    return escaped;
  }

  // DOM Content Loaded
  document.addEventListener('DOMContentLoaded', initData);

})();

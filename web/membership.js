// ========================================================
// 不動產估價師歷屆考題・會員制度與社群貢獻積分引擎 (Membership Engine)
// 支援五大專業稱號晉升、考友社群筆記、點讚互助與榮譽榜
// ========================================================

(function () {
  'use strict';

  // 1. 專業稱號體系 (5 階榮譽階梯)
  const APPRAISER_RANKS = [
    {
      level: 1,
      title: '估價學徒',
      badge: '🐣',
      minPoints: 0,
      maxPoints: 49,
      color: '#6c757d',
      bg: '#f8f9fa',
      border: '#ced4da',
      desc: '新進考生，初探地政法規與三大估價法門徑'
    },
    {
      level: 2,
      title: '助理估價員',
      badge: '📜',
      minPoints: 50,
      maxPoints: 199,
      color: '#0d6efd',
      bg: '#e7f1ff',
      border: '#b6d4fe',
      desc: '熟習估價技術規則條文，開始能提出法規關鍵要件'
    },
    {
      level: 3,
      title: '執業估價師',
      badge: '⚖️',
      minPoints: 200,
      maxPoints: 499,
      color: '#198754',
      bg: '#e8f5e9',
      border: '#a3cfbb',
      desc: '具備獨立破題與三大方法精算能力，常在考題分享核心爭點'
    },
    {
      level: 4,
      title: '資深合夥估價師',
      badge: '🏆',
      minPoints: 500,
      maxPoints: 999,
      color: '#fd7e14',
      bg: '#fff3cd',
      border: '#ffe69c',
      desc: '融會貫通公報、司法實務與經濟學圖解，筆記廣受考友推崇'
    },
    {
      level: 5,
      title: '榜首大宗師',
      badge: '👑',
      minPoints: 1000,
      maxPoints: Infinity,
      color: '#6f42c1',
      bg: '#f3e8ff',
      border: '#d8b4fe',
      desc: '全科考點精準洞悉，考友社群頂級榮譽會員、榜首標竿'
    }
  ];

  // 積分分值規則
  const POINT_RULES = {
    POST_NOTE: 20,       // 發布社群筆記
    RECEIVE_UPVOTE: 5,   // 筆記獲讚
    FINISH_EXAM: 10,     // 模考卷交卷
    DAILY_CHECKIN: 5,    // 每日打卡簽到
    FEATURED_NOTE: 50    // 獲選精華擬答
  };

  // 2. 考友社群種子成員與經典筆記（讓使用者立即感受社群討論氛圍）
  const SEED_MEMBERS = [
    { id: 'usr_top_01', nickname: '陳品睿 估價師', points: 1280, rankTitle: '榜首大宗師', notesCount: 42, upvotesCount: 168 },
    { id: 'usr_top_02', nickname: '林政宇（地政所研二）', points: 760, rankTitle: '資深合夥估價師', notesCount: 28, upvotesCount: 96 },
    { id: 'usr_top_03', nickname: '張雅筑（公職地政同仁）', points: 430, rankTitle: '執業估價師', notesCount: 16, upvotesCount: 52 },
    { id: 'usr_top_04', nickname: '高點上榜學長・Kevin', points: 310, rankTitle: '執業估價師', notesCount: 11, upvotesCount: 45 },
    { id: 'usr_top_05', nickname: '估價小書僮', points: 140, rankTitle: '助理估價員', notesCount: 6, upvotesCount: 18 }
  ];

  const SEED_NOTES = {
    "114130_0301_一_1": [
      {
        id: "seed_note_01",
        questionId: "114130_0301_一_1",
        authorId: "usr_top_01",
        authorName: "陳品睿 估價師",
        authorRank: "榜首大宗師",
        authorLevel: 5,
        content: "這題是平均地權條例第 62 條的大考點！破題切記先破「權利同一性說」（非原始取得），原抵押權依 §64 逕行轉載。但書的「不可分處分」最容易舉錯例子，記得寫：\n1. 違章建築拆除處分（附麗於原物理構造物）\n2. 袋地通行權確定判決（重劃後已面臨建築線道路，原判決拘束力終止）。答出這兩個例子閱卷老師直接給高分！",
        upvotes: 24,
        isFeatured: true,
        createdAt: "2026-09-15T09:30:00Z"
      },
      {
        id: "seed_note_02",
        questionId: "114130_0301_一_1",
        authorId: "usr_top_03",
        authorName: "張雅筑（公職地政同仁）",
        authorRank: "執業估價師",
        authorLevel: 3,
        content: "補充實務細節：第 62 條所謂視為原有土地，在稅法上非常關鍵！原土地的申報地價與前次移轉現值，會依照重劃後權利價值比例轉載到新土地上（依 §38），這樣日後移轉才能正確扣抵土地增值稅！",
        upvotes: 15,
        isFeatured: false,
        createdAt: "2026-09-17T14:20:00Z"
      }
    ]
  };

  // 3. 會員資料持久化（本地 LocalStorage 與跨端同步）
  const STORAGE_KEY_PROFILE = 'appraiser_member_profile';
  const STORAGE_KEY_COMMUNITY_NOTES = 'appraiser_community_notes';
  const STORAGE_KEY_UPVOTED_IDS = 'appraiser_user_upvoted_notes';
  const STORAGE_KEY_ACCOUNTS_DB = 'appraiser_accounts_db';
  const STORAGE_KEY_AUTH_SESSION = 'appraiser_auth_session';

  let currentMember = null;
  let userUpvotedNoteIds = new Set();
  let localCommunityNotes = {};

  // Web Crypto SHA-256 加密雜湊
  async function sha256Hex(plainText) {
    try {
      const salt = 'appraiser_taiwan_salt_2026';
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText + salt);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < plainText.length; i++) {
        hash = ((hash << 5) - hash) + plainText.charCodeAt(i);
        hash |= 0;
      }
      return 'fallback_' + Math.abs(hash).toString(16);
    }
  }

  function getAccountsDb() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_ACCOUNTS_DB) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveAccountsDb(db) {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS_DB, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save accounts DB', e);
    }
  }

  function getActiveSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_AUTH_SESSION) || 'null');
    } catch (e) {
      return null;
    }
  }

  function saveActiveSession(session) {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
      }
    } catch (e) {}
  }

  // 跨裝置同步金鑰產生器 (Cross-Device Sync Passkey Pack)
  function generateSyncPasskey() {
    if (!currentMember) return '';
    try {
      const payload = {
        v: 1,
        id: currentMember.id,
        acc: currentMember.account || ('guest_' + currentMember.id.slice(-6)),
        pwd: currentMember.passwordHash || '',
        nick: currentMember.nickname,
        pts: currentMember.points || 0,
        rk: currentMember.rankTitle || '估價學徒',
        nts: currentMember.notesCount || 0,
        upv: currentMember.upvotesCount || 0,
        exs: currentMember.examsCount || 0,
        strk: currentMember.checkinStreak || 1,
        favs: JSON.parse(localStorage.getItem('appraiser_favs') || '[]'),
        notes: JSON.parse(localStorage.getItem('appraiser_notes') || '{}'),
        custom: JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}'),
        ts: Date.now()
      };
      const jsonStr = unescape(encodeURIComponent(JSON.stringify(payload)));
      return 'APPR-SYNC-' + btoa(jsonStr);
    } catch (e) {
      console.error('Failed to generate sync passkey', e);
      return '';
    }
  }

  // 跨裝置同步金鑰解碼器
  function parseSyncPasskey(passkey) {
    try {
      let raw = (passkey || '').trim();
      if (raw.startsWith('APPR-SYNC-')) {
        raw = raw.replace('APPR-SYNC-', '');
      }
      const jsonStr = decodeURIComponent(escape(atob(raw)));
      const payload = JSON.parse(jsonStr);
      if (!payload || !payload.acc) {
        throw new Error('Invalid passkey structure');
      }
      return payload;
    } catch (e) {
      return null;
    }
  }

  function initMemberSystem() {
    // 讀取點讚紀錄
    try {
      const upvoted = JSON.parse(localStorage.getItem(STORAGE_KEY_UPVOTED_IDS) || '[]');
      userUpvotedNoteIds = new Set(upvoted);
    } catch (e) {
      userUpvotedNoteIds = new Set();
    }

    // 讀取或初始化社群筆記
    try {
      localCommunityNotes = JSON.parse(localStorage.getItem(STORAGE_KEY_COMMUNITY_NOTES) || 'null');
      if (!localCommunityNotes) {
        localCommunityNotes = JSON.parse(JSON.stringify(SEED_NOTES));
        saveCommunityNotes();
      }
    } catch (e) {
      localCommunityNotes = JSON.parse(JSON.stringify(SEED_NOTES));
    }

    // 讀取活動 Session 帳號
    const session = getActiveSession();
    if (session && session.account) {
      const accountsDb = getAccountsDb();
      const accountData = accountsDb[session.account.toLowerCase()];
      if (accountData) {
        currentMember = {
          ...accountData,
          isGuest: false
        };
      }
    }

    // 若無活動 Session 則讀取或初始化訪客檔案
    if (!currentMember) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
        if (saved) {
          currentMember = JSON.parse(saved);
        }
      } catch (e) {
        currentMember = null;
      }
    }

    if (!currentMember) {
      // 首次產生新訪客
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      currentMember = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        account: null,
        isGuest: true,
        nickname: `估價考生_${randomNum}`,
        points: 0,
        rankTitle: '估價學徒',
        notesCount: 0,
        upvotesCount: 0,
        examsCount: 0,
        lastCheckinDate: '',
        checkinStreak: 0,
        createdAt: new Date().toISOString()
      };
      saveMemberProfile();
    }

    // 校準等級稱號
    recalculateMemberRank();

    // 執行每日簽到打卡檢驗
    checkDailyCheckin();

    // 更新頂部 UI
    updateHeaderMemberCapsule();
  }

  function saveMemberProfile() {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(currentMember));
      // 若已登入正式帳號，即時同步至 accountsDb 與用戶數據
      if (currentMember && currentMember.account && !currentMember.isGuest) {
        const db = getAccountsDb();
        const acc = currentMember.account.toLowerCase();
        db[acc] = {
          ...(db[acc] || {}),
          ...currentMember,
          favorites: JSON.parse(localStorage.getItem('appraiser_favs') || '[]'),
          notes: JSON.parse(localStorage.getItem('appraiser_notes') || '{}'),
          customCram: JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}'),
          updatedAt: new Date().toISOString()
        };
        saveAccountsDb(db);
        cloudSyncPushProfile(currentMember);
      }
    } catch (e) {
      console.error('Failed to save member profile', e);
    }
  }

  // Supabase 雲端資料庫多端同步支援（若已設定 window.SUPABASE_CONFIG）
  function isSupabaseConfigured() {
    return Boolean(
      window.SUPABASE_CONFIG &&
      window.SUPABASE_CONFIG.url &&
      window.SUPABASE_CONFIG.anonKey &&
      window.SUPABASE_CONFIG.url.startsWith('http')
    );
  }

  async function cloudSyncPushProfile(profile) {
    if (!isSupabaseConfigured() || !profile || !profile.account) return;
    try {
      const url = `${window.SUPABASE_CONFIG.url}/rest/v1/member_profiles?on_conflict=id`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': window.SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: profile.id,
          account: profile.account,
          password_hash: profile.passwordHash,
          nickname: profile.nickname,
          points: profile.points,
          rank_title: profile.rankTitle,
          notes_count: profile.notesCount,
          upvotes_count: profile.upvotesCount,
          exams_count: profile.examsCount,
          last_checkin_date: profile.lastCheckinDate,
          user_data: {
            favorites: JSON.parse(localStorage.getItem('appraiser_favs') || '[]'),
            notes: JSON.parse(localStorage.getItem('appraiser_notes') || '{}'),
            customCram: JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}')
          },
          updated_at: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('Cloud sync push notification', e);
    }
  }

  async function cloudSyncFetchAccount(account) {
    if (!isSupabaseConfigured()) return null;
    try {
      const url = `${window.SUPABASE_CONFIG.url}/rest/v1/member_profiles?account=eq.${encodeURIComponent(account)}&select=*`;
      const res = await fetch(url, {
        headers: {
          'apikey': window.SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${window.SUPABASE_CONFIG.anonKey}`
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.length > 0) {
        const row = data[0];
        return {
          id: row.id,
          account: row.account,
          nickname: row.nickname,
          passwordHash: row.password_hash,
          points: row.points,
          rankTitle: row.rank_title,
          notesCount: row.notes_count,
          upvotesCount: row.upvotes_count,
          examsCount: row.exams_count,
          lastCheckinDate: row.last_checkin_date,
          favorites: (row.user_data && row.user_data.favorites) || [],
          notes: (row.user_data && row.user_data.notes) || {},
          customCram: (row.user_data && row.user_data.customCram) || {},
          updatedAt: row.updated_at
        };
      }
    } catch (e) {
      console.warn('Cloud sync fetch notification', e);
    }
    return null;
  }

  function saveCommunityNotes() {
    try {
      localStorage.setItem(STORAGE_KEY_COMMUNITY_NOTES, JSON.stringify(localCommunityNotes));
    } catch (e) {
      console.error('Failed to save community notes', e);
    }
  }

  function saveUpvotedIds() {
    try {
      localStorage.setItem(STORAGE_KEY_UPVOTED_IDS, JSON.stringify([...userUpvotedNoteIds]));
    } catch (e) {}
  }

  // 帳號註冊 (支援合併既有訪客刷題進度)
  async function registerAccount(accountInput, passwordInput, nicknameInput) {
    const account = (accountInput || '').trim().toLowerCase();
    const password = (passwordInput || '').trim();
    const nickname = (nicknameInput || '').trim();

    if (!account || account.length < 3) {
      alert('帳號長度至少需 3 個字元（英數字、底線或 Email）！');
      return false;
    }
    if (!password || password.length < 6) {
      alert('密碼長度至少需 6 個字元以上！');
      return false;
    }
    if (!nickname) {
      alert('請輸入您在社群筆記中顯示的考友暱稱！');
      return false;
    }

    const accountsDb = getAccountsDb();
    if (accountsDb[account]) {
      alert(`帳號「${account}」已被註冊，請直接點選「登入現有帳號」或更換帳號名稱！`);
      return false;
    }

    const pwdHash = await sha256Hex(password);
    const pts = currentMember ? (currentMember.points || 0) : 0;
    const rank = getRankByPoints(pts);

    const accountRecord = {
      id: currentMember ? currentMember.id : ('usr_' + Date.now()),
      account: account,
      nickname: nickname,
      passwordHash: pwdHash,
      points: pts,
      rankTitle: rank.title,
      notesCount: currentMember ? (currentMember.notesCount || 0) : 0,
      upvotesCount: currentMember ? (currentMember.upvotesCount || 0) : 0,
      examsCount: currentMember ? (currentMember.examsCount || 0) : 0,
      checkinStreak: currentMember ? (currentMember.checkinStreak || 1) : 1,
      lastCheckinDate: currentMember ? (currentMember.lastCheckinDate || '') : '',
      favorites: JSON.parse(localStorage.getItem('appraiser_favs') || '[]'),
      notes: JSON.parse(localStorage.getItem('appraiser_notes') || '{}'),
      customCram: JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    accountsDb[account] = accountRecord;
    saveAccountsDb(accountsDb);

    currentMember = {
      ...accountRecord,
      isGuest: false
    };
    saveMemberProfile();
    saveActiveSession({ account: account, loggedInAt: Date.now() });

    cloudSyncPushProfile(currentMember);

    updateHeaderMemberCapsule();
    showPointsToast(0, '🎉 恭喜註冊成功！已自動登入並合併您的全部刷題進度', rank);

    window.switchMemberModalTab('account');
    return true;
  }

  // 帳號登入
  async function loginAccount(accountInput, passwordInput) {
    const account = (accountInput || '').trim().toLowerCase();
    const password = (passwordInput || '').trim();

    if (!account || !password) {
      alert('請輸入帳號與密碼！');
      return false;
    }

    const accountsDb = getAccountsDb();
    const pwdHash = await sha256Hex(password);

    let found = accountsDb[account];
    // 若本機查無此帳號且有設定雲端資料庫，從雲端拉取
    if (!found && isSupabaseConfigured()) {
      found = await cloudSyncFetchAccount(account);
      if (found) {
        accountsDb[account] = found;
        saveAccountsDb(accountsDb);
      }
    }

    if (!found) {
      alert(`查無此帳號「${account}」！\n若您是首次使用，請點選「註冊新帳號」；或在其他裝置複製「跨裝置同步金鑰」貼入即可直接登入。`);
      return false;
    }

    if (found.passwordHash && found.passwordHash !== pwdHash) {
      alert('密碼不正確，請重新輸入！');
      return false;
    }

    currentMember = {
      ...found,
      isGuest: false
    };
    saveMemberProfile();
    saveActiveSession({ account: account, loggedInAt: Date.now() });

    if (found.favorites) {
      localStorage.setItem('appraiser_favs', JSON.stringify(found.favorites));
    }
    if (found.notes) {
      localStorage.setItem('appraiser_notes', JSON.stringify(found.notes));
    }
    if (found.customCram) {
      localStorage.setItem('appraiser_custom_cram', JSON.stringify(found.customCram));
    }
    if (window.reloadUserData) {
      window.reloadUserData();
    }

    recalculateMemberRank();
    updateHeaderMemberCapsule();
    const rank = getRankByPoints(currentMember.points);
    showPointsToast(0, `👋 歡迎回來，${currentMember.nickname}！已成功登入會員帳號`, rank);

    window.switchMemberModalTab('account');
    return true;
  }

  // 帳號登出
  function logoutAccount() {
    if (!confirm('確定要登出當前帳號嗎？登出後將切換為訪客模式，隨時可再次登入。')) {
      return;
    }

    if (currentMember && currentMember.account) {
      const accountsDb = getAccountsDb();
      accountsDb[currentMember.account.toLowerCase()] = {
        ...currentMember,
        favorites: JSON.parse(localStorage.getItem('appraiser_favs') || '[]'),
        notes: JSON.parse(localStorage.getItem('appraiser_notes') || '{}'),
        customCram: JSON.parse(localStorage.getItem('appraiser_custom_cram') || '{}'),
        updatedAt: new Date().toISOString()
      };
      saveAccountsDb(accountsDb);
    }

    saveActiveSession(null);

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    currentMember = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      account: null,
      isGuest: true,
      nickname: `估價考生_${randomNum}`,
      points: 0,
      rankTitle: '估價學徒',
      notesCount: 0,
      upvotesCount: 0,
      examsCount: 0,
      lastCheckinDate: '',
      checkinStreak: 0,
      createdAt: new Date().toISOString()
    };
    saveMemberProfile();
    updateHeaderMemberCapsule();

    if (window.reloadUserData) {
      window.reloadUserData();
    }

    alert('您已安全登出！目前為訪客體驗模式。');
    window.switchMemberModalTab('account');
  }

  // 跨裝置同步金鑰匯入登入
  function importSyncPasskey(keyString) {
    const payload = parseSyncPasskey(keyString);
    if (!payload) {
      alert('無效或格式錯誤的跨裝置同步金鑰！請確認是否完整複製以「APPR-SYNC-」開頭的金鑰。');
      return false;
    }

    const accountsDb = getAccountsDb();
    const accKey = (payload.acc || 'user_' + Date.now()).toLowerCase();

    const accountRecord = {
      id: payload.id || ('usr_' + Date.now()),
      account: payload.acc,
      nickname: payload.nick || '估價考友',
      passwordHash: payload.pwd || '',
      points: payload.pts || 0,
      rankTitle: payload.rk || '估價學徒',
      notesCount: payload.nts || 0,
      upvotesCount: payload.upv || 0,
      examsCount: payload.exs || 0,
      checkinStreak: payload.strk || 1,
      favorites: payload.favs || [],
      notes: payload.notes || {},
      customCram: payload.custom || {},
      updatedAt: new Date().toISOString()
    };

    accountsDb[accKey] = accountRecord;
    saveAccountsDb(accountsDb);

    currentMember = {
      ...accountRecord,
      isGuest: false
    };
    saveMemberProfile();
    saveActiveSession({ account: payload.acc, loggedInAt: Date.now() });

    if (payload.favs) {
      localStorage.setItem('appraiser_favs', JSON.stringify(payload.favs));
    }
    if (payload.notes) {
      localStorage.setItem('appraiser_notes', JSON.stringify(payload.notes));
    }
    if (payload.custom) {
      localStorage.setItem('appraiser_custom_cram', JSON.stringify(payload.custom));
    }
    if (window.reloadUserData) {
      window.reloadUserData();
    }

    recalculateMemberRank();
    updateHeaderMemberCapsule();
    const rank = getRankByPoints(currentMember.points);
    showPointsToast(0, `📱 跨裝置帳號同步成功！已成功載入「${payload.nick}」所有答題進度 (${currentMember.points} pt)`, rank);

    window.switchMemberModalTab('account');
    return true;
  }

  // 4. 等級稱號計算邏輯
  function getRankByPoints(pts) {
    for (let i = APPRAISER_RANKS.length - 1; i >= 0; i--) {
      if (pts >= APPRAISER_RANKS[i].minPoints) {
        return APPRAISER_RANKS[i];
      }
    }
    return APPRAISER_RANKS[0];
  }

  function getNextRank(pts) {
    const current = getRankByPoints(pts);
    const nextIdx = APPRAISER_RANKS.findIndex(r => r.level === current.level + 1);
    if (nextIdx !== -1) {
      return APPRAISER_RANKS[nextIdx];
    }
    return null; // 已達最高級 (榜首大宗師)
  }

  function recalculateMemberRank() {
    const rank = getRankByPoints(currentMember.points);
    const prevRankTitle = currentMember.rankTitle;
    currentMember.rankTitle = rank.title;
    saveMemberProfile();
    return { currentRank: rank, upgraded: prevRankTitle !== rank.title && currentMember.points > 0 };
  }

  // 5. 積分獲取與升級慶祝
  function addPoints(amount, reason, notify = true) {
    if (!amount || amount <= 0) return;
    const oldPts = currentMember.points;
    currentMember.points += amount;

    const oldRank = getRankByPoints(oldPts);
    const newRank = getRankByPoints(currentMember.points);

    saveMemberProfile();
    updateHeaderMemberCapsule();

    // 彈出加分提示
    if (notify) {
      showPointsToast(amount, reason, newRank);
    }

    // 檢驗是否升級
    if (newRank.level > oldRank.level) {
      showLevelUpCelebration(newRank);
    }
  }

  // 6. 每日簽到
  function checkDailyCheckin() {
    const today = new Date().toISOString().split('T')[0];
    if (currentMember.lastCheckinDate !== today) {
      currentMember.lastCheckinDate = today;
      currentMember.checkinStreak = (currentMember.checkinStreak || 0) + 1;
      addPoints(POINT_RULES.DAILY_CHECKIN, '每日登入打卡刷題獎勵', false);
      saveMemberProfile();
    }
  }

  // 7. 社群筆記操作
  function getNotesForQuestion(qId) {
    return localCommunityNotes[qId] || [];
  }

  function addCommunityNote(qId, content) {
    const trimmed = content.trim();
    if (!trimmed) {
      alert('請輸入筆記內容！');
      return null;
    }
    if (trimmed.length < 5) {
      alert('筆記內容請至少輸入 5 個字，分享有價值的考點！');
      return null;
    }

    const rank = getRankByPoints(currentMember.points);
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      questionId: qId,
      authorId: currentMember.id,
      authorName: currentMember.nickname,
      authorRank: rank.title,
      authorLevel: rank.level,
      content: trimmed,
      upvotes: 0,
      isFeatured: false,
      createdAt: new Date().toISOString()
    };

    if (!localCommunityNotes[qId]) {
      localCommunityNotes[qId] = [];
    }
    localCommunityNotes[qId].unshift(newNote);
    saveCommunityNotes();

    currentMember.notesCount = (currentMember.notesCount || 0) + 1;
    saveMemberProfile();

    // 獎勵發布筆記積分 (+20)
    addPoints(POINT_RULES.POST_NOTE, '分享考題社群筆記');

    return newNote;
  }

  function upvoteNote(noteId, qId) {
    if (userUpvotedNoteIds.has(noteId)) {
      alert('您已經給這則考友筆記按過讚囉！感謝您的認同與支持。');
      return false;
    }

    const notesList = localCommunityNotes[qId];
    if (!notesList) return false;

    const note = notesList.find(n => n.id === noteId);
    if (!note) return false;

    // 不能讚自己的筆記
    if (note.authorId === currentMember.id) {
      alert('不能給自己的筆記點讚哦！請多與其他考友切磋交流～');
      return false;
    }

    note.upvotes = (note.upvotes || 0) + 1;
    userUpvotedNoteIds.add(noteId);
    saveUpvotedIds();
    saveCommunityNotes();

    // 原作者若存在，可加分
    if (note.authorId === currentMember.id) {
      currentMember.upvotesCount = (currentMember.upvotesCount || 0) + 1;
      saveMemberProfile();
    }

    return true;
  }

  // 8. 取得考友榮譽榜（結合種子名師與真實成員動態排序）
  function getLeaderboard() {
    const list = [...SEED_MEMBERS];
    // 檢查目前使用者是否在名單內
    const existingIdx = list.findIndex(m => m.id === currentMember.id);
    const userRank = getRankByPoints(currentMember.points);
    const userItem = {
      id: currentMember.id,
      nickname: currentMember.nickname + ' (您)',
      points: currentMember.points,
      rankTitle: userRank.title,
      notesCount: currentMember.notesCount || 0,
      upvotesCount: currentMember.upvotesCount || 0,
      isMe: true
    };

    if (existingIdx !== -1) {
      list[existingIdx] = userItem;
    } else {
      list.push(userItem);
    }

    list.sort((a, b) => b.points - a.points);
    return list;
  }

  // 9. UI 渲染與 Toast 提示
  function updateHeaderMemberCapsule() {
    const capsuleEl = document.getElementById('memberHeaderBtn');
    if (!capsuleEl) return;

    const rank = getRankByPoints(currentMember.points);
    capsuleEl.innerHTML = `
      <span class="member-badge-icon">${rank.badge}</span>
      <span class="member-rank-name">${rank.title}</span>
      <span class="member-nickname">${escapeHtml(currentMember.nickname)}</span>
      <span class="member-pts-pill">${currentMember.points} pt</span>
    `;
    capsuleEl.style.borderColor = rank.border;
  }

  function showPointsToast(amount, reason, rank) {
    let toast = document.getElementById('appPointsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appPointsToast';
      toast.className = 'points-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="toast-pts">+${amount} 積分</div>
      <div class="toast-desc">${escapeHtml(reason)}</div>
      <div class="toast-rank">目前階級：${rank.badge} ${rank.title} (${currentMember.points} pt)</div>
    `;

    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  function showLevelUpCelebration(newRank) {
    let modal = document.getElementById('levelUpModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'levelUpModal';
      modal.className = 'modal-backdrop levelup-modal-backdrop';
      modal.innerHTML = `
        <div class="modal-card levelup-card">
          <div class="levelup-icon">${newRank.badge}</div>
          <div class="levelup-title">🎉 賀！榮譽升級 🎉</div>
          <div class="levelup-subtitle">恭喜您晉升為</div>
          <div class="levelup-rank" style="color:${newRank.color};">${newRank.title}</div>
          <div class="levelup-desc">${newRank.desc}</div>
          <div class="levelup-points">累積貢獻積分：<strong>${currentMember.points}</strong> pt</div>
          <button class="btn-primary levelup-btn" onclick="window.closeLevelUpModal()">領取榮譽稱號並繼續刷題</button>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.querySelector('.levelup-icon').textContent = newRank.badge;
      modal.querySelector('.levelup-rank').textContent = newRank.title;
      modal.querySelector('.levelup-rank').style.color = newRank.color;
      modal.querySelector('.levelup-desc').textContent = newRank.desc;
      modal.querySelector('.levelup-points strong').textContent = currentMember.points;
    }

    modal.style.display = 'flex';
  }

  window.closeLevelUpModal = function () {
    const modal = document.getElementById('levelUpModal');
    if (modal) modal.style.display = 'none';
  };

  // 10. 會員中心彈窗 (Profile Modal)
  window.openMemberModal = function () {
    const modal = document.getElementById('memberProfileModal');
    if (!modal) return;

    const rank = getRankByPoints(currentMember.points);
    const nextRank = getNextRank(currentMember.points);

    // 計算進度條比例
    let progressPct = 100;
    let neededText = '已達榮譽頂峰！全科考點精準大宗師';
    if (nextRank) {
      const span = nextRank.minPoints - rank.minPoints;
      const currentSpan = currentMember.points - rank.minPoints;
      progressPct = Math.min(100, Math.max(0, Math.round((currentSpan / span) * 100)));
      const diff = nextRank.minPoints - currentMember.points;
      neededText = `距離晉升【${nextRank.badge} ${nextRank.title}】還差 <strong>${diff}</strong> 積分（目前進度 ${progressPct}%）`;
    }

    // 渲染個人資訊與進度條
    const infoContainer = document.getElementById('memberModalProfileInfo');
    if (infoContainer) {
      const isLogged = currentMember && !currentMember.isGuest && currentMember.account;
      infoContainer.innerHTML = `
        <!-- Account Status Capsule Banner -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; margin-bottom:14px; border-radius:var(--radius-sm); font-size:0.86rem; ${isLogged ? 'background:#e8f5e9; border:1px solid #a3cfbb; color:#198754;' : 'background:#fff3cd; border:1px solid #ffeeba; color:#856404;'}">
          <div style="display:flex; align-items:center; gap:6px;">
            <span>${isLogged ? '✓' : '⚠️'}</span>
            <span>${isLogged ? `已登入會員帳號：<strong>${escapeHtml(currentMember.account)}</strong>` : '目前為訪客模式（換手機或電腦無法同步）'}</span>
          </div>
          <button class="timer-btn" style="padding:4px 10px; font-size:0.8rem; border-color:currentColor;" onclick="window.switchMemberModalTab('account')">
            ${isLogged ? '📱 跨裝置同步金鑰' : '🔐 登入/註冊帳號以同步'}
          </button>
        </div>

        <div class="member-hero-card" style="background: ${rank.bg}; border-color: ${rank.border};">
          <div class="member-hero-header">
            <div class="member-avatar-box">${rank.badge}</div>
            <div class="member-hero-meta">
              <div style="display:flex; align-items:center; gap:8px;">
                <h3 class="member-hero-name" id="modalNicknameDisplay">${escapeHtml(currentMember.nickname)}</h3>
                <button class="btn-text-edit" onclick="window.editMemberNickname()" title="修改稱呼">✎</button>
              </div>
              <div class="member-hero-rank" style="color:${rank.color};">
                ${rank.badge} ${rank.title} (Level ${rank.level})
              </div>
            </div>
            <div class="member-hero-pts">
              <div class="pts-number">${currentMember.points}</div>
              <div class="pts-label">貢獻積分</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="member-progress-box">
            <div class="member-progress-bar-bg">
              <div class="member-progress-bar-fill" style="width: ${progressPct}%; background: linear-gradient(90deg, ${rank.color}, #d4a373);"></div>
            </div>
            <div class="member-progress-label">${neededText}</div>
          </div>

          <!-- Stats Grid -->
          <div class="member-stats-grid">
            <div class="stat-cell">
              <div class="stat-num">${currentMember.notesCount || 0}</div>
              <div class="stat-name">✍️ 分享筆記</div>
            </div>
            <div class="stat-cell">
              <div class="stat-num">${currentMember.upvotesCount || 0}</div>
              <div class="stat-name">👍 累積獲讚</div>
            </div>
            <div class="stat-cell">
              <div class="stat-num">${currentMember.examsCount || 0}</div>
              <div class="stat-name">📝 完成模考</div>
            </div>
            <div class="stat-cell">
              <div class="stat-num">${currentMember.checkinStreak || 1} 天</div>
              <div class="stat-name">📅 連續簽到</div>
            </div>
          </div>
        </div>
      `;
    }

    // 同步渲染帳號管理分頁
    renderAccountTabView();

    // 渲染稱號圖鑑 (Hall of Ranks)
    const ranksContainer = document.getElementById('memberModalRanksHall');
    if (ranksContainer) {
      ranksContainer.innerHTML = APPRAISER_RANKS.map(r => {
        const isUnlocked = currentMember.points >= r.minPoints;
        const isCurrent = r.level === rank.level;
        return `
          <div class="rank-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}">
            <div class="rank-card-icon">${r.badge}</div>
            <div class="rank-card-meta">
              <div class="rank-card-title">
                ${r.title}
                ${isCurrent ? '<span class="rank-current-badge">目前等級</span>' : ''}
              </div>
              <div class="rank-card-score">${r.minPoints} ~ ${r.maxPoints === Infinity ? '無上限' : r.maxPoints} 分</div>
              <div class="rank-card-desc">${r.desc}</div>
            </div>
            <div class="rank-card-status">
              ${isUnlocked ? '<span class="status-tag unlocked">✓ 已解鎖</span>' : '<span class="status-tag locked">🔒 未達成</span>'}
            </div>
          </div>
        `;
      }).join('');
    }

    // 渲染考友貢獻榮譽榜 (Leaderboard)
    const leaderboardContainer = document.getElementById('memberModalLeaderboard');
    if (leaderboardContainer) {
      const topList = getLeaderboard().slice(0, 10);
      leaderboardContainer.innerHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th style="width: 50px;">排名</th>
              <th>考友暱稱</th>
              <th>等級稱號</th>
              <th>分享筆記</th>
              <th style="text-align: right;">貢獻積分</th>
            </tr>
          </thead>
          <tbody>
            ${topList.map((m, idx) => {
              const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}`));
              const r = getRankByPoints(m.points);
              return `
                <tr class="${m.isMe ? 'leaderboard-me-row' : ''}">
                  <td style="font-weight:700; text-align:center;">${medal}</td>
                  <td style="font-weight:600;">${escapeHtml(m.nickname)}</td>
                  <td><span class="table-rank-badge" style="color:${r.color};">${r.badge} ${r.title}</span></td>
                  <td>${m.notesCount || 0} 則</td>
                  <td style="text-align: right; font-weight:700; color:var(--text-sumi);">${m.points} pt</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    modal.style.display = 'flex';
  };

  window.closeMemberModal = function () {
    const modal = document.getElementById('memberProfileModal');
    if (modal) modal.style.display = 'none';
  };

  window.editMemberNickname = function () {
    const newName = prompt('請輸入您在社群筆記中顯示的考友暱稱：', currentMember.nickname);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed.length > 0 && trimmed.length <= 15) {
        currentMember.nickname = trimmed;
        saveMemberProfile();
        updateHeaderMemberCapsule();
        const display = document.getElementById('modalNicknameDisplay');
        if (display) display.textContent = trimmed;
        alert(`暱稱已成功更新為「${trimmed}」！`);
      } else {
        alert('暱稱長度需介於 1 到 15 個字元！');
      }
    }
  };

  // 帳號認證分頁 UI 渲染
  let currentAuthTabMode = 'login'; // 'login' | 'register' | 'sync'

  window.setAuthTabMode = function (mode) {
    currentAuthTabMode = mode;
    renderAccountTabView();
  };

  function renderAccountTabView() {
    const container = document.getElementById('memberModalAccountContainer');
    if (!container) return;

    const isLogged = currentMember && !currentMember.isGuest && currentMember.account;
    const rank = getRankByPoints(currentMember ? currentMember.points : 0);

    if (isLogged) {
      const syncKey = generateSyncPasskey();
      container.innerHTML = `
        <div class="auth-card-logged-in">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="auth-status-badge synced">✓ 已登入正式會員帳號</span>
              <span style="font-size:0.8rem; color:var(--text-muted);">跨裝置連線已啟用</span>
            </div>
            <button class="btn-text-edit" onclick="window.logoutAccount()" style="font-size:0.84rem; color:var(--accent-vermilion); cursor:pointer;">
              🚪 登出帳號
            </button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
            <div class="stat-cell" style="background:var(--bg-subtle);">
              <div style="font-size:0.75rem; color:var(--text-muted);">登入帳號</div>
              <div style="font-weight:700; color:var(--text-sumi); font-size:1.0rem;">${escapeHtml(currentMember.account)}</div>
            </div>
            <div class="stat-cell" style="background:var(--bg-subtle);">
              <div style="font-size:0.75rem; color:var(--text-muted);">社群暱稱</div>
              <div style="font-weight:700; color:var(--text-sumi); font-size:1.0rem;">${escapeHtml(currentMember.nickname)}</div>
            </div>
            <div class="stat-cell" style="background:var(--bg-subtle);">
              <div style="font-size:0.75rem; color:var(--text-muted);">榮譽稱號</div>
              <div style="font-weight:700; color:${rank.color}; font-size:1.0rem;">${rank.badge} ${rank.title}</div>
            </div>
            <div class="stat-cell" style="background:var(--bg-subtle);">
              <div style="font-size:0.75rem; color:var(--text-muted);">累積積分</div>
              <div style="font-weight:700; color:var(--text-sumi); font-size:1.0rem;">${currentMember.points} pt</div>
            </div>
          </div>

          <!-- Cross-device Sync Section -->
          <div class="sync-passkey-box">
            <div style="font-size:0.92rem; font-weight:700; color:var(--text-sumi); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
              <span>📱</span>
              <span>在手機或其他電腦登入同一個帳號</span>
            </div>
            <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:10px; line-height:1.5;">
              想在手機隨時刷題？您可以在手機瀏覽器點擊右上角會員圖示，直接輸入上方帳號與密碼；或者複製下方「跨裝置同步金鑰」貼上，即可一秒將目前所有積分、草稿筆記與收藏題庫同步到手機！
            </div>
            <textarea class="sync-passkey-textarea" id="mySyncPasskeyInput" readonly onclick="this.select()">${syncKey}</textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:8px;">
              <button class="comm-publish-btn" onclick="window.copyMySyncPasskey()" style="padding:7px 16px; font-size:0.85rem;">
                📋 一鍵複製跨裝置同步金鑰
              </button>
            </div>
          </div>

          <div class="auth-btn-row">
            <button class="timer-btn" onclick="window.setAuthTabMode('login')" style="flex:1;">
              👥 切換其他帳號
            </button>
            <button class="timer-btn" onclick="window.switchMemberModalTab('profile')" style="flex:1;">
              📊 查看我的稱號進度
            </button>
          </div>
        </div>
      `;
    } else {
      // Guest Mode Form
      const pts = currentMember ? (currentMember.points || 0) : 0;
      container.innerHTML = `
        <div class="auth-container">
          <div class="auth-guest-notice">
            <div style="display:flex; align-items:center; gap:6px; font-weight:700; margin-bottom:4px;">
              <span>💡 目前為訪客模式（已累積 ${pts} 積分）</span>
            </div>
            <div>
              建立帳號後，您在不同電腦、手機或平板都可以登入同一個帳號刷題！現有累積的積分、草稿筆記與收藏題目將自動合併保留至新帳號中。
            </div>
          </div>

          <div class="auth-nav-pills">
            <button class="auth-nav-pill ${currentAuthTabMode === 'login' ? 'active' : ''}" onclick="window.setAuthTabMode('login')">
              登入現有帳號
            </button>
            <button class="auth-nav-pill ${currentAuthTabMode === 'register' ? 'active' : ''}" onclick="window.setAuthTabMode('register')">
              註冊新帳號
            </button>
            <button class="auth-nav-pill ${currentAuthTabMode === 'sync' ? 'active' : ''}" onclick="window.setAuthTabMode('sync')">
              貼上跨裝置金鑰
            </button>
          </div>

          ${currentAuthTabMode === 'login' ? `
            <!-- Login Form -->
            <form id="formAuthLogin" onsubmit="event.preventDefault(); window.submitAuthLogin();">
              <div class="auth-form-group">
                <label class="auth-form-label" for="loginAccInput">帳號或 Email：</label>
                <input type="text" id="loginAccInput" class="auth-input" placeholder="請輸入註冊帳號或 Email" required autocomplete="username">
              </div>
              <div class="auth-form-group">
                <label class="auth-form-label" for="loginPwdInput">密碼：</label>
                <input type="password" id="loginPwdInput" class="auth-input" placeholder="請輸入登入密碼" required autocomplete="current-password">
              </div>
              <button type="submit" class="auth-submit-btn">
                🔐 登入會員帳號並同步資料
              </button>
              <div style="text-align:center; margin-top:12px; font-size:0.82rem; color:var(--text-muted);">
                還沒有帳號？ <a href="javascript:void(0)" onclick="window.setAuthTabMode('register')" style="color:var(--accent-indigo); font-weight:600;">立即免費註冊</a>
              </div>
            </form>
          ` : currentAuthTabMode === 'register' ? `
            <!-- Register Form -->
            <form id="formAuthRegister" onsubmit="event.preventDefault(); window.submitAuthRegister();">
              <div class="auth-form-group">
                <label class="auth-form-label" for="regAccInput">自訂帳號（英數字或 Email）：</label>
                <input type="text" id="regAccInput" class="auth-input" placeholder="例如：appraiser_pro 或 user@gmail.com" required autocomplete="username">
              </div>
              <div class="auth-form-group">
                <label class="auth-form-label" for="regNickInput">考友社群顯示暱稱：</label>
                <input type="text" id="regNickInput" class="auth-input" value="${escapeHtml(currentMember ? currentMember.nickname : '')}" placeholder="例如：陳品睿 估價師" required>
              </div>
              <div class="auth-form-group">
                <label class="auth-form-label" for="regPwdInput">設定登入密碼（至少 6 位）：</label>
                <input type="password" id="regPwdInput" class="auth-input" placeholder="設定 6 位以上密碼" required autocomplete="new-password">
              </div>
              <button type="submit" class="auth-submit-btn">
                🎉 立即註冊並合併現有 ${pts} 積分
              </button>
              <div style="text-align:center; margin-top:12px; font-size:0.82rem; color:var(--text-muted);">
                已有帳號？ <a href="javascript:void(0)" onclick="window.setAuthTabMode('login')" style="color:var(--accent-indigo); font-weight:600;">點此登入</a>
              </div>
            </form>
          ` : `
            <!-- Sync Passkey Form -->
            <form id="formAuthSync" onsubmit="event.preventDefault(); window.submitAuthSync();">
              <div class="auth-form-group">
                <label class="auth-form-label" for="syncPasskeyInput">貼上在電腦或其他手機複製的跨裝置同步金鑰：</label>
                <textarea id="syncPasskeyInput" class="sync-passkey-textarea" style="height:90px;" placeholder="貼上 APPR-SYNC-... 格式的金鑰" required></textarea>
              </div>
              <button type="submit" class="auth-submit-btn">
                📱 立即匯入並登入同步
              </button>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:8px; line-height:1.5;">
                💡 在另一台電腦登入帳號後，進入「會員中心」$\to$「帳號登入與跨端同步」即可點擊複製專屬同步金鑰。
              </div>
            </form>
          `}
        </div>
      `;
    }
  }

  window.copyMySyncPasskey = function () {
    const el = document.getElementById('mySyncPasskeyInput');
    if (!el) return;
    el.select();
    try {
      navigator.clipboard.writeText(el.value).then(() => {
        alert('跨裝置同步金鑰已複製到剪貼簿！\n在手機開啟本網頁，點擊右上角會員 $\to$「帳號登入與跨端同步」$\to$「貼上跨裝置金鑰」即可一秒登入同步！');
      }).catch(() => {
        document.execCommand('copy');
        alert('跨裝置同步金鑰已複製到剪貼簿！');
      });
    } catch (e) {
      document.execCommand('copy');
      alert('跨裝置同步金鑰已複製到剪貼簿！');
    }
  };

  window.submitAuthLogin = async function () {
    const acc = document.getElementById('loginAccInput').value;
    const pwd = document.getElementById('loginPwdInput').value;
    await loginAccount(acc, pwd);
  };

  window.submitAuthRegister = async function () {
    const acc = document.getElementById('regAccInput').value;
    const pwd = document.getElementById('regPwdInput').value;
    const nick = document.getElementById('regNickInput').value;
    await registerAccount(acc, pwd, nick);
  };

  window.submitAuthSync = function () {
    const key = document.getElementById('syncPasskeyInput').value;
    importSyncPasskey(key);
  };

  window.logoutAccount = logoutAccount;

  window.switchMemberModalTab = function (tabName) {
    const tabs = ['profile', 'account', 'hall', 'leaderboard'];
    tabs.forEach(t => {
      const btn = document.getElementById(`btnMemberTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const view = document.getElementById(`memberTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (view) {
        view.style.display = t === tabName ? 'block' : 'none';
        view.classList.toggle('active', t === tabName);
      }
    });

    if (tabName === 'account') {
      renderAccountTabView();
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 11. 公開對外介面
  window.AppraiserMembership = {
    init: initMemberSystem,
    getProfile: () => currentMember,
    getRank: () => getRankByPoints(currentMember ? currentMember.points : 0),
    addPoints: addPoints,
    getNotes: getNotesForQuestion,
    addNote: addCommunityNote,
    upvoteNote: upvoteNote,
    getLeaderboard: getLeaderboard,
    register: registerAccount,
    login: loginAccount,
    logout: logoutAccount,
    generateSyncPasskey: generateSyncPasskey,
    importSyncPasskey: importSyncPasskey,
    POINT_RULES: POINT_RULES,
    escapeHtml: escapeHtml
  };

  // 自動在 DOM 就緒後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMemberSystem);
  } else {
    initMemberSystem();
  }

})();

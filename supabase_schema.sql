-- ========================================================
-- 不動產估價師歷屆考題・社群筆記與會員積分系統資料表結構
-- 請在 Supabase 後台的 "SQL Editor" 貼上並執行即可！
-- ========================================================

-- 1. 啟用 UUID 擴充功能
create extension if not exists "uuid-ossp";

-- 2. 會員個人檔案資料表 (member_profiles)
create table if not exists public.member_profiles (
  id text primary key,                     -- 使用者唯一 ID (UUID 或隨機碼)
  nickname text not null default '匿名考友', -- 暱稱
  points integer not null default 0,       -- 累積貢獻積分
  rank_title text not null default '估價學徒',-- 當前等級稱號
  notes_count integer not null default 0,  -- 發布筆記總數
  upvotes_count integer not null default 0,-- 獲得點讚總數
  exams_count integer not null default 0,  -- 完成模擬考次數
  last_checkin_date date,                  -- 最後簽到日期
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 考友社群筆記資料表 (community_notes)
create table if not exists public.community_notes (
  id uuid default uuid_generate_v4() primary key,
  question_id text not null,               -- 考題 ID (如 114130_0301_一_1)
  author_id text not null,                 -- 作者 member_profiles.id
  author_name text not null,               -- 作者發布時暱稱
  author_rank text not null default '估價學徒',-- 作者發布時等級稱號
  content text not null,                   -- 筆記內容
  upvotes integer not null default 0,      -- 獲得點讚數
  is_featured boolean not null default false,-- 是否為精選置頂擬答
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 建立索引加速查詢
create index if not exists idx_community_notes_qid on public.community_notes (question_id);
create index if not exists idx_community_notes_created on public.community_notes (created_at desc);

-- 4. 點讚防重複紀錄表 (note_upvotes)
create table if not exists public.note_upvotes (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid not null references public.community_notes(id) on delete cascade,
  user_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(note_id, user_id)
);

-- 5. 設定 Row Level Security (RLS) 安全策略：允許公開匿名讀取與寫入
alter table public.member_profiles enable row level security;
alter table public.community_notes enable row level security;
alter table public.note_upvotes enable row level security;

-- 允許任何人讀取與新增/更新個人檔案
create policy "Allow public read member_profiles" on public.member_profiles for select using (true);
create policy "Allow public insert member_profiles" on public.member_profiles for insert with check (true);
create policy "Allow public update member_profiles" on public.member_profiles for update using (true);

-- 允許任何人讀取與發布社群筆記
create policy "Allow public read community_notes" on public.community_notes for select using (true);
create policy "Allow public insert community_notes" on public.community_notes for insert with check (true);
create policy "Allow public update community_notes" on public.community_notes for update using (true);

-- 允許任何人讀取與點讚
create policy "Allow public read note_upvotes" on public.note_upvotes for select using (true);
create policy "Allow public insert note_upvotes" on public.note_upvotes for insert with check (true);

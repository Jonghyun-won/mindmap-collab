# MindMap Collab

실시간 협업 마인드맵 애플리케이션

## Features

- 🚀 **실시간 동기화** (Google Sheets처럼 즉시 반영)
- 👥 **다중 사용자 협업** (최대 10명 동시 편집)
- 🔒 **충돌 없는 편집** (CRDT 기반 자동 병합)
- 🎯 **실시간 커서** (다른 사용자의 마우스 위치 표시)
- 👤 **협업자 아바타** (현재 접속 중인 사용자 표시)
- ⌨️ **키보드 단축키** (Enter: 형제 노드, Ctrl+Enter: 하위 노드)
- 🎨 **계층별 색상** (레벨에 따라 자동 색상 지정)
- 📦 **박스 선택** (드래그로 여러 노드 선택)
- 🔄 **Undo/Redo** (Ctrl+Z로 실행 취소)
- 💾 **자동 저장** (30초마다 자동 저장 + 수동 저장)
- 🌐 **웹 브라우저** (별도 설치 불필요)
- 🆓 **무료 호스팅** (Vercel + Railway + Supabase)

## Tech Stack

### Frontend
- React 18 + TypeScript
- React Flow (마인드맵 시각화)
- Tailwind CSS
- Vite

### Real-Time Collaboration
- Yjs (CRDT 엔진)
- y-websocket
- Hocuspocus

### Backend
- Supabase (PostgreSQL + Auth)
- Railway.app (WebSocket 서버)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mindmap-collab
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and add your Supabase credentials:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the following SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mind maps table
CREATE TABLE mind_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ydoc_snapshot BYTEA
);

-- Collaborators table
CREATE TABLE mind_map_collaborators (
  mind_map_id UUID REFERENCES mind_maps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (mind_map_id, user_id)
);

-- Row Level Security policies
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_map_collaborators ENABLE ROW LEVEL SECURITY;

-- Mind maps policies
CREATE POLICY "Users can view mind maps they own or collaborate on"
  ON mind_maps FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM mind_map_collaborators
      WHERE mind_map_id = mind_maps.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mind maps"
  ON mind_maps FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update mind maps they own"
  ON mind_maps FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete mind maps they own"
  ON mind_maps FOR DELETE
  USING (auth.uid() = owner_id);

-- Collaborators policies
CREATE POLICY "Users can view collaborators of their mind maps"
  ON mind_map_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND (owner_id = auth.uid() OR id IN (
        SELECT mind_map_id FROM mind_map_collaborators WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Mind map owners can manage collaborators"
  ON mind_map_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mind_maps
      WHERE id = mind_map_id AND owner_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mind_maps_updated_at
  BEFORE UPDATE ON mind_maps
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
```

### Running the Development Server

```bash
# Start the frontend
npm run dev:web
```

Open [http://localhost:5173](http://localhost:5173)

## Project Structure

```
mindmap-collab/
├── apps/
│   ├── web/                    # Frontend React app
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Libraries and configs
│   │   │   ├── pages/          # Page components
│   │   │   └── types/          # TypeScript types
│   │   └── package.json
│   └── server/                 # Hocuspocus WebSocket server (Phase 3)
└── package.json
```

## Development Phases

- ✅ **Phase 1**: Foundation (Auth, Database, Basic UI)
- ✅ **Phase 2**: Mind map visualization (React Flow integration)
- ✅ **Phase 3**: Real-time collaboration (Yjs + Hocuspocus)
- ✅ **Phase 4**: Presence & Polish (Cursors, UX improvements)

## 주요 기능 사용법

### 키보드 단축키
- `Enter` - 형제 노드 생성 (같은 레벨)
- `Ctrl + Enter` - 하위 노드 생성 (한 단계 아래)
- `Delete` - 선택된 노드 삭제
- `Ctrl + S` - 수동 저장
- `Ctrl + Z` - 실행 취소
- `Ctrl + C` - 노드 복사
- `Ctrl + V` - 노드 붙여넣기

### 다중 선택
- `Shift + 클릭` - 여러 노드 개별 선택
- `빈 공간 드래그` - 박스로 여러 노드 선택

### 노드 편집
- `더블클릭` - 노드 텍스트 편집
- `드래그` - 노드 이동 (하위 노드도 함께 이동)
- 노드를 다른 노드에 드래그 - 부모 변경 (reparenting)

### 실시간 협업
- 우측 상단에 현재 접속 중인 사용자 수 표시
- 다른 사용자의 커서가 실시간으로 표시됨
- 색상별 아바타로 협업자 구분
- 모든 변경사항이 즉시 동기화됨

## License

MIT

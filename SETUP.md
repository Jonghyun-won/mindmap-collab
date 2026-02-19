# Setup Guide

## 1. Supabase 설정

### 1.1 프로젝트 생성
1. [supabase.com](https://supabase.com)에 접속
2. "New Project" 클릭
3. 프로젝트 이름: `mindmap-collab`
4. 데이터베이스 비밀번호 설정 (잘 기억해두세요!)
5. 리전 선택: 가까운 리전 (예: ap-northeast-1)
6. 프로젝트 생성 완료 대기 (약 2분)

### 1.2 데이터베이스 마이그레이션
1. Supabase 대시보드에서 "SQL Editor" 메뉴 클릭
2. "New Query" 클릭
3. `supabase/migrations/001_initial_schema.sql` 파일 내용 복사
4. SQL 에디터에 붙여넣기
5. "Run" 버튼 클릭
6. 성공 메시지 확인

### 1.3 API 키 확인
1. Supabase 대시보드에서 "Settings" → "API" 메뉴
2. 다음 정보 복사:
   - Project URL (VITE_SUPABASE_URL)
   - anon public key (VITE_SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_KEY) - 서버용

## 2. 환경 변수 설정

### 2.1 Frontend (.env)
```bash
cd apps/web
cp .env.example .env
```

`.env` 파일 편집:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2.2 Backend (.env)
```bash
cd apps/server
cp .env.example .env
```

`.env` 파일 편집:
```
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-string
```

## 3. 로컬 개발 서버 실행

### 3.1 Frontend만 실행 (Phase 1)
```bash
# 프로젝트 루트에서
npm run dev:web
```

브라우저에서 http://localhost:5173 접속

### 3.2 Frontend + Backend (Phase 3부터)
```bash
# 터미널 1: Frontend
npm run dev:web

# 터미널 2: Backend (서버 의존성 설치 후)
cd apps/server
npm install --cache /tmp/npm-cache
npm run dev
```

## 4. 테스트

### Phase 1 테스트
1. http://localhost:5173 접속
2. "Sign up" 클릭
3. 이메일/비밀번호 입력하여 회원가입
4. 이메일 확인 링크 클릭 (개발 모드에서는 자동 확인)
5. 로그인
6. "New Mind Map" 버튼 클릭
7. 마인드맵 목록에 생성된 항목 확인
8. 항목 클릭하여 에디터 페이지 이동 확인

### Supabase 데이터 확인
1. Supabase 대시보드 → "Table Editor"
2. `mind_maps` 테이블에서 생성된 데이터 확인

## 5. 문제 해결

### 로그인 실패
- Supabase 대시보드 → Authentication → Settings
- "Enable Email Confirmations" 확인
- 개발 중에는 비활성화 가능

### CORS 에러
- Supabase 대시보드 → Settings → API
- "CORS" 섹션에서 localhost:5173 추가

### 데이터베이스 권한 에러
- RLS 정책이 올바르게 설정되었는지 확인
- SQL Editor에서 마이그레이션 재실행

## 6. 다음 단계

Phase 1 완료 후:
- ✅ 인증 작동
- ✅ 마인드맵 생성/목록
- ✅ 기본 UI

Phase 2: React Flow 통합
- 노드 추가/편집/삭제
- 시각화

Phase 3: 실시간 협업
- Yjs 통합
- WebSocket 연결

## 도움이 필요하신가요?

- [Supabase 문서](https://supabase.com/docs)
- [React Flow 문서](https://reactflow.dev)
- [Yjs 문서](https://docs.yjs.dev)

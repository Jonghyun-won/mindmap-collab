# Quick Start Guide

빠르게 프로젝트를 시작하는 방법입니다.

## 1. Supabase 설정 (5분)

### 프로젝트 생성
1. https://supabase.com 접속 및 로그인
2. "New Project" 클릭
3. 프로젝트 이름: `mindmap-collab`
4. 비밀번호 설정 및 리전 선택
5. "Create new project" 클릭

### 데이터베이스 설정
1. 왼쪽 메뉴에서 "SQL Editor" 선택
2. "New Query" 클릭
3. 아래 파일 내용 복사하여 붙여넣기:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
4. "Run" 버튼 클릭
5. 성공 메시지 확인

### API 키 복사
1. 왼쪽 메뉴에서 "Settings" → "API" 선택
2. 다음 정보를 복사해두세요:
   - **Project URL**
   - **anon public** key

## 2. 환경 변수 설정 (2분)

```bash
# apps/web/.env 파일 생성
cd apps/web
cp .env.example .env
```

`.env` 파일을 열고 다음 내용을 수정:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 실행 (1분)

```bash
# 프로젝트 루트로 이동
cd /Users/funnel/mindmap-collab

# 프론트엔드 실행
npm run dev:web
```

브라우저에서 자동으로 http://localhost:5173 이 열립니다.

## 4. 테스트

1. **회원가입**
   - "Don't have an account? Sign up" 클릭
   - 이메일과 비밀번호 입력
   - "Sign up" 클릭

2. **로그인**
   - 이메일 확인 (개발 모드에서는 자동)
   - 로그인 페이지에서 이메일/비밀번호 입력

3. **마인드맵 생성**
   - "+ New Mind Map" 버튼 클릭
   - 에디터 페이지로 이동 확인

4. **데이터 확인**
   - Supabase 대시보드 → "Table Editor"
   - `mind_maps` 테이블에서 데이터 확인

## 성공! 🎉

Phase 1이 완료되었습니다. 이제 다음 단계로 진행할 수 있습니다:

- ✅ 인증 시스템 작동
- ✅ 데이터베이스 연결
- ✅ 기본 UI

## 다음 단계

### Phase 2: 마인드맵 시각화
React Flow를 통합하여 실제 마인드맵 편집 기능을 추가합니다.

### Phase 3: 실시간 협업
Yjs와 WebSocket을 통해 실시간 동기화를 구현합니다.

자세한 내용은 `README.md`와 `CHECKLIST.md`를 참고하세요.

## 문제 해결

### 로그인이 안 돼요
- Supabase 대시보드 → "Authentication" → "Providers"
- "Email" 활성화 확인
- "Confirm email" 옵션을 개발 중에는 비활성화

### CORS 에러
- Supabase 대시보드 → "Settings" → "API"
- "CORS" 섹션에 `http://localhost:5173` 추가

### npm 권한 에러
```bash
npm install --cache /tmp/npm-cache --workspace=apps/web
```

## 도움말

더 자세한 내용은:
- `SETUP.md` - 상세한 설정 가이드
- `README.md` - 프로젝트 개요
- `CHECKLIST.md` - 개발 진행 상황

# 🚀 START HERE - MindMap Collab

실시간 협업 마인드맵 애플리케이션에 오신 것을 환영합니다!

## ✅ Phase 1 완료!

프로젝트 기반 구축이 완료되었습니다. 이제 바로 시작할 수 있습니다.

## 🎯 빠른 시작 (15분)

### 1단계: Supabase 설정 (5분)

1. **프로젝트 생성**
   - https://supabase.com 접속
   - "New Project" 클릭
   - 이름: `mindmap-collab`
   - 비밀번호 설정 및 리전 선택

2. **데이터베이스 마이그레이션**
   - Supabase 대시보드 → SQL Editor
   - `supabase/migrations/001_initial_schema.sql` 파일 내용 복사
   - 붙여넣기 → Run

3. **API 키 복사**
   - Settings → API
   - Project URL과 anon public key 복사

### 2단계: 환경 변수 설정 (2분)

```bash
cd apps/web
cp .env.example .env
```

`.env` 파일 편집:
```
VITE_SUPABASE_URL=여기에_Project_URL_붙여넣기
VITE_SUPABASE_ANON_KEY=여기에_anon_key_붙여넣기
```

### 3단계: 실행 (1분)

```bash
# 프로젝트 루트에서
npm run dev:web
```

브라우저에서 http://localhost:5173 자동 오픈!

### 4단계: 테스트 (5분)

1. 회원가입
2. 로그인
3. "New Mind Map" 클릭
4. 성공! 🎉

## 📚 문서 가이드

프로젝트 상태에 따라 적절한 문서를 선택하세요:

### 처음 시작하시나요?
- 👉 **QUICKSTART.md** - 가장 빠른 시작 방법

### 자세한 설정이 필요하신가요?
- 📖 **SETUP.md** - 상세한 설정 가이드

### 프로젝트 개요가 궁금하신가요?
- 📘 **README.md** - 프로젝트 소개 및 기술 스택

### 개발 진행 상황을 확인하고 싶으신가요?
- ✅ **CHECKLIST.md** - Phase별 체크리스트
- 📊 **PROJECT_STATUS.md** - 상세한 프로젝트 상태

## 🏗️ 프로젝트 구조

```
mindmap-collab/
├── apps/
│   ├── web/           ← 프론트엔드 (React)
│   └── server/        ← 백엔드 (Phase 3에서 사용)
├── supabase/
│   └── migrations/    ← SQL 스키마
└── 문서들...
```

## 🎨 현재 기능

### ✅ 작동하는 기능
- 회원가입 / 로그인 / 로그아웃
- 마인드맵 생성
- 마인드맵 목록 보기
- 에디터 페이지 라우팅

### 🚧 다음 단계 (Phase 2)
- 노드 추가/편집/삭제
- 드래그 & 드롭
- 시각적 마인드맵

### 📅 향후 계획 (Phase 3-4)
- 실시간 협업
- 동시 편집
- 커서 공유

## 🛠️ 주요 명령어

```bash
# 개발 서버 실행
npm run dev:web

# 빌드 (프로덕션)
npm run build

# 타입 체크
cd apps/web && npx tsc --noEmit
```

## 💡 유용한 팁

### Supabase 개발 설정
이메일 확인을 비활성화하면 테스트가 더 빠릅니다:
- Supabase → Authentication → Settings
- "Enable email confirmations" 끄기

### 빠른 데이터 확인
- Supabase → Table Editor
- `mind_maps` 테이블에서 실시간 데이터 확인

### 에러 디버깅
- 브라우저 콘솔 확인 (F12)
- Supabase 대시보드 → Logs

## 🎓 학습 리소스

- [React Flow 문서](https://reactflow.dev) - Phase 2
- [Yjs 문서](https://docs.yjs.dev) - Phase 3
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🚦 현재 상태

```
Phase 1: ████████████████████ 100% ✅
Phase 2: ░░░░░░░░░░░░░░░░░░░░   0% 📅
Phase 3: ░░░░░░░░░░░░░░░░░░░░   0% 📅
Phase 4: ░░░░░░░░░░░░░░░░░░░░   0% 📅
```

## ❓ 문제 해결

### Q: npm 권한 에러가 나요
```bash
npm install --cache /tmp/npm-cache
```

### Q: Supabase 연결 에러
- `.env` 파일에 올바른 URL과 키가 있는지 확인
- Supabase 프로젝트가 "active" 상태인지 확인

### Q: 로그인이 안 돼요
- Supabase → Authentication → Providers에서 Email 활성화 확인
- SQL 마이그레이션이 정상 실행되었는지 확인

## 🎯 다음 할 일

Phase 1이 완료되었으므로, 이제 Phase 2로 진행할 수 있습니다:

1. React Flow 통합
2. 마인드맵 캔버스 구현
3. 노드 편집 기능

준비되셨나요? `CHECKLIST.md`의 "Phase 2" 섹션을 확인하세요!

---

**즐거운 개발 되세요! 🚀**

문제가 있으시면 문서를 참고하거나 Supabase/React Flow 커뮤니티에 질문해보세요.

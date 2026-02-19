# Funnel Crew - Project Guidelines

## 🤖 퍼널이 Agent 실행 지침

퍼널이는 Funnel Crew의 오케스트레이터로, 전문 에이전트들에게 작업을 위임하여 최적의 결과를 도출합니다.

### 필수 요구사항

- [HARD] 위임 체크리스트: 모든 작업 전 "🚦 위임 가능성 체크리스트" 필수 확인
  WHY: 퍼널이는 오케스트레이터, 직접 작업은 최소화

- [HARD] 위임 알림: sub-agent에게 작업 위임 시 사용자에게 먼저 알림
  형식: "🔄 [에이전트명]에게 [작업내용] 위임합니다"
  WHY: 작업 흐름 투명성 확보

- [HARD] 아키텍처 준수: Architecture 섹션의 규칙 엄격히 따름
  WHY: 일관된 구조가 유지보수성 보장

- [HARD] 병렬 실행 우선: 독립적인 작업은 반드시 여러 Task를 동시에 spawn하여 병렬 처리
  WHY: 작업 시간 단축, 효율성 극대화

- [HARD] Plan 결과 공유: Plan sub-agent 사용 후 반드시 계획 내용을 사용자에게 직접 보여줄 것
  WHY: 사용자가 계획을 검토하고 피드백할 수 있어야 함

- [HARD] 커밋/푸시 금지: 유저가 명시적으로 요청할 때만 git commit/push 실행
  WHY: 의도치 않은 커밋은 git 히스토리 오염, 되돌리기 어려움

---

## 🚦 위임 가능성 체크리스트 (BEFORE YOU START)

작업을 시작하기 전, 반드시 다음을 체크하세요:

### 1단계: 위임 필수 확인

다음 중 하나라도 해당하면 **반드시 위임**:
- [ ] 문서 작성/수정 (plan.md, README.md 등) → `docs-writer`
- [ ] Python 코드 작성/수정 → `python-coder`
- [ ] React/Frontend 코드 작성/수정 → `frontend-coder`
- [ ] UI 레이아웃 설계 → `ascii-page-designer`
- [ ] shadcn/ui 컴포넌트 검색 → `ui-component-matcher`
- [ ] 3개 이상의 파일 수정 → Plan 에이전트로 계획 수립 후 위임
- [ ] 도메인 전문 지식 필요 (데이터베이스, API, UI/UX)

**자기 점검 질문:**
- "내가 지금 코드를 작성하려는가?" → YES면 STOP! 즉시 위임
- "Write/Edit 도구를 사용하려는가?" → YES면 STOP! 즉시 위임

### 2단계: Agent-Ready 테스트

위임하려는 작업이 다음 조건을 만족하는가?
- [ ] 작업 범위가 명확하고 구체적한가?
- [ ] 성공 기준이 측정 가능한가?
- [ ] 필요한 도구/권한이 명확한가?
- [ ] "주니어 개발자에게 상세 브리핑으로 위임 가능한가?"

→ 모두 YES면 즉시 위임, NO가 있으면 사용자에게 질문 후 위임

### 3단계: 직접 작업 예외 (ONLY THESE)

다음의 경우만 퍼널이가 직접 작업:
- [ ] 단순 파일 읽기/검색 (코드 수정 없음)
- [ ] 사용자 질문에 대한 답변
- [ ] 작업 계획 수립 및 사용자 확인

---

## ⛔ 도구 사용 규칙

| 도구 | 사용 | 용도 |
|------|------|------|
| Write, Edit, NotebookEdit | ❌ 금지 | 코드 작성/수정은 전문 에이전트에게 위임 |
| Read, Glob, Grep | ✅ 허용 | 컨텍스트 파악, 파일/코드 검색 |
| Task | ✅ 허용 | sub-agent 위임 |
| TodoWrite | ✅ 허용 | 작업 관리 |
| AskUserQuestion | ✅ 허용 | 요구사항 명확화 |

---

## ⚠️ Git 작업 규칙

| 명령어 | 허용 조건 |
|--------|-----------|
| git status, git diff, git log | ✅ 자유롭게 사용 |
| git add | ✅ 커밋 준비 시 |
| git commit | ❌ 유저 요청 시만 |
| git push | ❌ 유저 요청 시만 |
| git push --force | ❌ 절대 금지 |

---

## Sub-agent Delegation

| 작업 유형 | 에이전트 | 비고 |
|----------|---------|------|
| **문서 작성** | docs-writer | plan.md, README.md, CHANGELOG.md 등 |
| **API 명세 작성** | api-yaml-designer | OpenAPI 3.0, api.yaml 생성 |
| **Python 개발** | python-coder | main() + argparse CLI 패턴 |
| **Frontend 개발** | frontend-coder | React/Vite/Tailwind/shadcn-ui |
| 레이아웃 설계 | ascii-page-designer | ASCII 스케치 + 컴포넌트 추천 |
| 컴포넌트 검색 | ui-component-matcher | shadcn-basic/shadcnblock/evil-chart 검색 |
| **Linear 관리** | linear-controller | 이슈/프로젝트/코멘트 CRUD (mcp-cli 전담) |

---

## 📋 위임 시 필수 템플릿

sub-agent에게 위임할 때 반드시 다음 형식으로 구조화:

```
🔄 [에이전트명]에게 "[작업내용]" 위임합니다

**TASK**: [구체적이고 원자적인 작업]
**EXPECTED OUTCOME**:
  - [측정 가능한 성공 기준 1]
  - [측정 가능한 성공 기준 2]
**REQUIRED TOOLS**: [Read, Write, Edit, Bash 등 명시]
**MUST DO**:
  - [필수 요구사항 1]
  - [필수 요구사항 2]
**MUST NOT DO**:
  - [금지 사항 1]
  - [금지 사항 2]
```

### 위임 예시

#### 예시 1: Backend 개발 위임
```
🔄 python-coder에게 "유저 로그인 API 엔드포인트 구현" 위임합니다

**TASK**: backend/auth/login.py 구현
**EXPECTED OUTCOME**:
  - email/password 받아서 JWT 토큰 반환
  - api.yaml의 POST /auth/login 스펙 준수
  - psycopg2로 Supabase DB 연결
**REQUIRED TOOLS**: Write, Edit, Bash
**MUST DO**:
  - main() + argparse 패턴 사용
  - conn.py의 get_db_connection() 활용
  - 에러 처리 포함 (401, 500)
**MUST NOT DO**:
  - __init__.py 생성 금지
  - 복잡한 클래스 구조 금지
  - frontend 코드 수정 금지
```

#### 예시 2: Frontend 개발 위임
```
🔄 frontend-coder에게 "대시보드 페이지 구현" 위임합니다

**TASK**: frontend/src/pages/Dashboard.tsx 생성
**EXPECTED OUTCOME**:
  - api.yaml의 GET /dashboard 엔드포인트 호출
  - 차트 3개 + 통계 카드 4개 레이아웃
  - shadcn/ui 컴포넌트 사용
**REQUIRED TOOLS**: Write, Edit, Bash, Task
**MUST DO**:
  - ui-component-matcher로 컴포넌트 검색 후 사용
  - TypeScript + React 19 패턴
  - 에러 처리 및 로딩 상태 포함
**MUST NOT DO**:
  - 직접 DB 접근 금지 (반드시 API 통해서)
  - 인라인 스타일 금지 (Tailwind CSS 사용)
  - 하드코딩된 API URL 금지 (환경변수 사용)
```

#### 예시 3: UI 컴포넌트 검색 위임
```
🔄 ui-component-matcher에게 "대시보드용 차트 컴포넌트 검색" 위임합니다

**TASK**: 대시보드에 사용할 차트 컴포넌트 3종 추천
**EXPECTED OUTCOME**:
  - Line Chart (시간별 트렌드)
  - Bar Chart (카테고리별 비교)
  - Pie Chart (비율 분포)
**REQUIRED TOOLS**: Grep, Read
**MUST DO**:
  - evil-chart 우선 검색
  - shadcnblock 차트 섹션 확인
  - 각 컴포넌트 경로 및 사용법 제공
**MUST NOT DO**:
  - 컴포넌트 직접 수정 금지
  - 새 컴포넌트 생성 금지
```

---

## Fullstack App Workflow

### 프로젝트 구조

```
project/
├── api.yaml            # [필수] API 명세 - Step 1에서 작성
├── backend/
│   ├── .env            # [필수] 환경변수 (DATABASE_URL, API_KEYS 등)
│   ├── Dockerfile      # [필수] Python 컨테이너
│   ├── api.py          # [필수] FastAPI 엔트리포인트 - 모든 함수를 HTTP로 노출
│   ├── conn.py         # DB 연결 - 모든 서비스에서 `from conn import` 로 사용
│   └── [서비스]/       # 서비스별 폴더 (auth/, users/, orders/ 등)
│       ├── model.py    # Pydantic 모델 - api.yaml 스키마와 1:1 매핑
│       └── {기능}.py   # 개별 기능 파일 (login.py, register.py 등)
└── frontend/
    ├── .env            # [필수] 환경변수 (VITE_API_BASE_URL)
    ├── Dockerfile      # [필수] React 컨테이너
    └── src/
        ├── components/
        │   ├── ui/          # [필수] 공통 UI 컴포넌트 - 디자인 일관성 유지
        │   └── [feature]/   # 기능별 컴포넌트
        ├── pages/           # 페이지 컴포넌트
        ├── contexts/        # Context Provider
        ├── lib/             # 유틸리티 (api-client 등)
        └── types/           # TypeScript 타입 - api.yaml 스키마와 1:1 매핑
            └── {서비스}.ts  # 서비스별 타입 (auth.ts, users.ts 등)
```

### 개발 순서 (반드시 준수)

**중요: 각 단계는 이전 단계가 완전히 완료된 후 진행합니다.**

**Step 1: API 명세 작성**
- 에이전트: `api-yaml-designer`
- OpenAPI 3.0 스펙
- `api.yaml` 파일 생성
- 검증: https://editor.swagger.io
- Frontend/Backend 계약 확정

**Step 2: Backend 구현**
- 에이전트: `python-coder`
- **기술 스택**: Python 3.12 + `uv` 패키지 매니저
- **규칙**: `__init__.py` 금지 (PEP 420), `main()` + argparse 패턴
- **DB**: Supabase (PostgreSQL) + psycopg2
- **실행 위치**: 반드시 `backend/` 디렉토리에서 실행
- **실행 명령어**:
  - API 서버: `uv run api.py`
  - 개별 서비스: `uv run {서비스}/{파일}.py` (예: `uv run auth/login.py`)
- **PYTHONPATH**: `.env`의 `PYTHONPATH=.` 덕분에 모든 서비스 파일에서 `from conn import get_db_connection` 가능
- **Model 규칙**: 각 서비스 폴더에 `model.py` 생성
  - Pydantic 모델 사용
  - api.yaml `components/schemas`와 100% 일치 필수
  - 개발 순서: api.yaml → model.py → 서비스 파일
- api.yaml 기준으로 엔드포인트 개발
- **환경변수**: `backend/.env` 파일에 모든 민감 정보 관리
  - `DATABASE_URL` - Supabase 연결 문자열
  - `SUPABASE_KEY` - Supabase API 키
  - `JWT_SECRET` - JWT 시크릿 키
- `python-dotenv` 사용하여 `.env` 로드
- **병렬 가능**: 독립적인 엔드포인트는 동시 구현 가능
- **완료 조건**: 모든 API 엔드포인트 구현 및 테스트 완료
- **다음 단계 전제조건**: Backend 작업이 100% 완료되어야 함

**Step 3: Frontend 구현**
- 에이전트: `frontend-coder`
- **기술 스택**: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4
- **UI 라이브러리**: shadcn/ui (new-york style, neutral base color)
- **CSS 변수**: `frontend/src/index.css`의 `:root`에서 중앙 관리
- **폰트**: Pretendard 필수 사용
  - `src/index.css` 최상단에 추가:
  ```css
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
  @import "tailwindcss";
  @import "tw-animate-css";

  :root {
    --font-sans: "Pretendard Variable", sans-serif;
  }
  ```
- api.yaml 기준으로 API 호출 코드 작성
- 컴포넌트 검색: `ui-component-matcher`
- **환경변수**: `frontend/.env` 파일에 API URL 관리
  - `VITE_API_BASE_URL=http://localhost:8000` (개발)
- Vite 환경변수는 `VITE_` 접두사 필수
- `import.meta.env.VITE_API_BASE_URL`로 접근
- **Type 규칙**: `src/types/{서비스}.ts` 파일 생성
  - TypeScript interface 사용
  - api.yaml `components/schemas`와 100% 일치 필수
  - 개발 순서: api.yaml → types → 컴포넌트
- **전제조건**: Step 2 (Backend) 완전히 완료됨
- **로고 사용**: 로그인/회원가입 페이지, 사이드바 등에 회사 로고 포함
  - 로고 경로: `component-hub/logos/`
  - 로그인/회원가입 페이지: `logo-en-blue.svg` (컬러 영문 로고)
  - 사이드바 (펼침): `logo-en-black.svg` (흑백 영문 로고)
  - 사이드바 (접힘) / 파비콘: `symbol.svg` (심볼만)
  - 한글이 필요한 경우: `logo-ko.svg`

**Step 4: 컨테이너화**
- **전제조건**: Step 2 (Backend) + Step 3 (Frontend) 완료
- 에이전트: `python-coder` (Dockerfile 작성)

**Backend Dockerfile**
- 베이스 이미지: `python:3.12-slim`
- 패키지 매니저: `uv` (pip 아님)
- 포트: `8000`
- `.env`는 컨테이너에 포함하지 않음 (런타임 주입)

**Frontend Dockerfile**
- Multi-stage build
  - Stage 1: `node:20-alpine` (빌드)
  - Stage 2: `nginx:alpine` (서빙)
- 포트: `80`
- 빌드 시 `VITE_API_BASE_URL` 주입

### 실행 원칙

1. **순차적 단계 완료**: API 명세 → Backend → Frontend → 컨테이너화
2. **병렬 작업 허용**: 각 단계 내에서 독립적인 작업은 병렬 가능
3. **완료 검증**: 각 단계 완료 후 사용자 확인
4. **의존성 준수**: Backend 완료 없이 Frontend 시작 금지

### 환경변수 관리

**Backend (`backend/.env`)**
```
PYTHONPATH=.
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_KEY=your-supabase-key
JWT_SECRET=your-jwt-secret
```

**Frontend (`frontend/.env`)**
```
VITE_API_BASE_URL=http://localhost:8000
```

**규칙:**
1. `.env` 파일은 `.gitignore`에 포함 (커밋 금지)
2. `.env.example` 파일로 필요한 변수 목록 문서화
3. Backend: `python-dotenv`로 로드
4. Frontend: Vite의 `import.meta.env.VITE_API_BASE_URL` 사용
5. 하드코딩된 URL/키 절대 금지
6. Backend `PYTHONPATH=.`: 서비스 폴더에서 공통 모듈 import 허용

### Backend 실행 규칙

**필수: 모든 명령어는 `backend/` 디렉토리에서 실행**

```bash
cd backend

# API 서버 실행
uv run api.py

# 개별 서비스 파일 실행/테스트
uv run auth/login.py
uv run users/get_user.py
uv run orders/create.py
```

**왜 backend/에서 실행해야 하는가?**
- `.env`의 `PYTHONPATH=.`이 현재 디렉토리를 기준으로 동작
- `backend/`에서 실행해야 `conn.py`, `utils/` 등 공통 모듈 import 가능
- 다른 디렉토리에서 실행하면 `ModuleNotFoundError` 발생

**서비스 파일에서 공통 모듈 import:**
```python
# backend/auth/login.py
from conn import get_db_connection
from utils.validation import validate_email
from utils.auth_helper import create_jwt_token
```

### Backend 병렬 처리 최적화

Backend 개발 시 의존성으로 인한 대기 시간을 최소화하기 위해 내부를 Sub-Phase로 분리합니다.

**Sub-Phase 1: Foundation (공통 파일 먼저)**

공통 의존성 파일을 먼저 생성:
- `backend/.env` - 환경변수 (DATABASE_URL, SUPABASE_KEY, JWT_SECRET 등)
- `backend/conn.py` - 데이터베이스 연결 함수 (.env에서 로드)
- `backend/{서비스}/model.py` - 각 서비스별 Pydantic 모델 (api.yaml 스키마 기반)
- `backend/utils/validation.py` - 공통 검증 로직
- `backend/utils/auth_helper.py` - 인증 헬퍼 함수
- 병렬 가능: 2-5개 파일 동시 생성

**Sub-Phase 2: Endpoints (병렬 최대화)**

Foundation 완료 후 모든 엔드포인트를 병렬로 구현:
- `auth/login.py` ∥ `auth/register.py` ∥ `auth/logout.py`
- `users/get_user.py` ∥ `users/update_user.py` ∥ `users/delete_user.py`
- `products/list.py` ∥ `products/get_product.py` ∥ `products/create.py`
- 병렬 가능: 10-20개 파일 동시 생성 ⚡
- 모든 파일이 Foundation의 공통 함수를 import하므로 의존성 해결됨

**Sub-Phase 3: api.py 생성 & Testing**

- `backend/api.py` 생성 (FastAPI 엔트리포인트)
- 각 모듈의 핵심 함수를 HTTP 라우트로 노출
- api.yaml 명세와 일치해야 함
- **실행**: `uv run api.py`
- 코드 예제: `python-coder` 에이전트 참조

**테스트:**
- API 서버 실행: `cd backend && uv run api.py`
- 개별 서비스 테스트: `cd backend && uv run auth/login.py`
- **모든 실행은 반드시 `backend/` 디렉토리에서**
- API 엔드포인트 동작 확인
- 에러 처리 검증
- Backend 100% 완료 확인

### Frontend 병렬 처리 최적화

**전제조건: Backend 100% 완료 필수**

Frontend 개발 시 내부를 Sub-Phase로 분리하여 병렬 최적화:

**Sub-Phase 1: Foundation**

공통 의존성 파일을 먼저 생성:
- `frontend/.env` - 환경변수 (VITE_API_BASE_URL)
- `src/lib/api-client.ts` - API 클라이언트 설정 (.env의 BASE_URL 사용)
- `src/types/{서비스}.ts` - 서비스별 TypeScript 타입 (api.yaml 스키마 기반)
- `src/contexts/AuthContext.tsx` - Context Provider
- 병렬 가능: 2-5개 파일 동시 생성

**Sub-Phase 1.5: 공통 UI 컴포넌트 (Foundation 직후)**

디자인 일관성을 위한 공통 컴포넌트 생성:
- `src/components/ui/Alert.tsx` - 알림/토스트
- `src/components/ui/DataTable.tsx` - 데이터 테이블
- `src/components/ui/Modal.tsx` - 모달/다이얼로그
- `src/components/ui/FormField.tsx` - 폼 필드 래퍼
- shadcn/ui 기본 컴포넌트 래핑하여 앱 스타일 적용
- 병렬 가능: 3-5개 파일 동시 생성

**Sub-Phase 2: Pages & Feature Components (병렬 최대화)**

공통 UI 컴포넌트 완료 후 모든 페이지/기능별 컴포넌트를 병렬로 구현:
- `pages/Dashboard.tsx` ∥ `pages/Profile.tsx` ∥ `pages/Settings.tsx`
- `components/dashboard/StatsCard.tsx` ∥ `components/dashboard/RevenueChart.tsx`
- `components/auth/LoginForm.tsx` ∥ `components/auth/RegisterForm.tsx`
- 병렬 가능: 10-20개 파일 동시 생성
- 모든 파일이 `components/ui/`의 공통 컴포넌트를 import하여 일관된 디자인 유지

**Sub-Phase 3: Integration & Testing**

모든 컴포넌트 통합 및 테스트:
- 페이지 라우팅 확인
- API 연동 검증
- Frontend 완료

### UI 컴포넌트 규칙

1. **ui/ 폴더 기준**: 2개 이상 페이지에서 사용되는 컴포넌트는 반드시 `components/ui/`에 배치
2. **shadcn/ui 래핑**: shadcn/ui 기본 컴포넌트를 래핑하여 앱 고유 스타일 적용
3. **Props 일관성**: 동일한 용도의 컴포넌트는 동일한 Props 인터페이스 유지
4. **feature 폴더**: 특정 페이지에서만 사용하는 컴포넌트는 `components/[feature]/`에 배치

### 병렬 처리 핵심 원칙

1. **Foundation 우선**: 공통 파일 먼저 (최소 2-5개)
2. **Application 병렬**: Foundation 후 모든 기능 동시 구현 (최대 10-20개)
3. **Backend 완료 후 Frontend**: 단계 간 순서는 엄격히 준수
4. **Sub-Phase 내 병렬**: 각 Sub-Phase 내에서는 최대 병렬화


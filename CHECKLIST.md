# Development Checklist

## Phase 1: 기반 구축 ✅

### Infrastructure
- [x] Vite + React + TypeScript 프로젝트 초기화
- [x] Tailwind CSS 설정
- [x] 프로젝트 구조 생성
- [x] 의존성 설치

### Authentication
- [x] Supabase 클라이언트 설정
- [x] useAuth hook 구현
- [x] LoginForm 컴포넌트
- [x] SignupForm 컴포넌트
- [x] 보호된 라우트 (React Router)

### Database
- [x] Supabase SQL 마이그레이션 파일
- [x] mind_maps 테이블
- [x] mind_map_collaborators 테이블
- [x] Row Level Security 정책
- [x] Indexes & Triggers

### Basic UI
- [x] Header 컴포넌트
- [x] HomePage (마인드맵 목록)
- [x] EditorPage (빈 에디터)
- [x] LoginPage

### Documentation
- [x] README.md
- [x] SETUP.md
- [x] .env.example
- [x] .gitignore

### Backend Setup (Phase 3에서 사용)
- [x] Hocuspocus 서버 기본 구조
- [x] Supabase 영속성 확장
- [x] 인증 확장
- [x] Dockerfile
- [x] Railway 설정

### 다음 단계
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 로컬 실행 및 테스트

---

## Phase 2: 마인드맵 시각화 (다음 단계)

### React Flow 통합
- [ ] React Flow 설치 확인
- [ ] MindMapCanvas 컴포넌트 생성
- [ ] 기본 캔버스 (팬/줌)
- [ ] CustomNode 컴포넌트
- [ ] CustomEdge 컴포넌트

### Mind Map 기능
- [ ] 노드 추가 버튼
- [ ] 노드 텍스트 편집 (더블클릭)
- [ ] 노드 삭제 (Delete 키)
- [ ] 노드 드래그 & 이동
- [ ] 노드 연결 (핸들)
- [ ] 노드 스타일링 (색상, 크기)

### State Management
- [ ] useMindMapStore hook
- [ ] localStorage 영속성
- [ ] React Flow 상태 관리

### Toolbar
- [ ] 노드 추가 버튼
- [ ] 색상 선택기
- [ ] Undo/Redo 버튼
- [ ] 줌 컨트롤

---

## Phase 3: 실시간 협업

### Hocuspocus 서버
- [ ] 로컬 서버 실행 테스트
- [ ] Railway.app 배포
- [ ] WebSocket 연결 확인
- [ ] 환경 변수 설정

### Yjs 통합
- [ ] useYjsCollaboration hook
- [ ] Y.Doc 생성
- [ ] WebSocket 프로바이더 설정
- [ ] Y.Map (nodes, edges) 설정

### 동기화 로직
- [ ] mindmap-sync.ts 브릿지
- [ ] Y.Doc → React Flow 동기화
- [ ] React Flow → Y.Doc 동기화
- [ ] 충돌 해결 테스트

### 테스트
- [ ] 여러 브라우저 창 테스트
- [ ] 동시 편집 테스트
- [ ] 오프라인 편집 + 재연결 테스트
- [ ] 네트워크 단절 시나리오

---

## Phase 4: 프레즌스 & 완성도

### Awareness
- [ ] usePresence hook
- [ ] 온라인 사용자 아바타
- [ ] CollaboratorCursors 컴포넌트
- [ ] 사용자별 색상 코드

### UX 개선
- [ ] 로딩 상태 표시
- [ ] 에러 처리
- [ ] 재연결 중 표시
- [ ] Undo/Redo (Yjs)
- [ ] 키보드 단축키

### 성능 최적화
- [ ] 텍스트 입력 디바운스
- [ ] React 리렌더링 최적화
- [ ] 대용량 마인드맵 테스트
- [ ] 메모리 누수 확인

### 배포
- [ ] Vercel 프론트엔드 배포
- [ ] Railway 백엔드 배포
- [ ] 프로덕션 환경 변수 설정
- [ ] 엔드투엔드 테스트

### 추가 기능
- [ ] 마인드맵 제목 수정
- [ ] 마인드맵 삭제
- [ ] 협업자 초대
- [ ] 권한 관리 (owner/editor/viewer)

---

## Testing Checklist

### Phase 1 검증
- [ ] 회원가입 작동
- [ ] 로그인 작동
- [ ] 로그아웃 작동
- [ ] 마인드맵 생성
- [ ] 마인드맵 목록 표시
- [ ] 에디터 페이지 라우팅
- [ ] Supabase 데이터베이스 확인

### Phase 2 검증
- [ ] 노드 추가
- [ ] 노드 이동
- [ ] 노드 텍스트 편집
- [ ] 노드 삭제
- [ ] 노드 연결
- [ ] 스타일 변경
- [ ] localStorage 저장/로드

### Phase 3 검증
- [ ] WebSocket 연결
- [ ] 실시간 노드 동기화
- [ ] 동시 편집
- [ ] 충돌 없는 병합
- [ ] 오프라인 복구

### Phase 4 검증
- [ ] 온라인 사용자 표시
- [ ] 커서 위치 표시
- [ ] Undo/Redo
- [ ] 에러 처리
- [ ] 성능 (100+ 노드)

---

## 현재 상태: Phase 1 완료 ✅

다음 실행 단계:
1. SETUP.md 가이드 따라 Supabase 설정
2. 환경 변수 설정
3. `npm run dev:web` 실행
4. 로컬에서 Phase 1 테스트
5. Phase 2 시작 (React Flow 통합)

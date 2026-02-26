import { Megaphone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function Section({ date, children }: { date: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-semibold text-blue-600 mb-3">{date}</h3>
      {children}
    </div>
  )
}

function Category({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <h4 className="text-sm font-medium text-gray-800 mb-1.5">
        {icon} {title}
      </h4>
      <ul className="space-y-1 ml-6">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 list-disc">{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function ReleaseNotesModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-full shadow-sm hover:text-blue-600 hover:border-blue-300 hover:shadow transition-all"
        >
          <Megaphone className="w-3.5 h-3.5" />
          v6
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            릴리즈 노트
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-5 pr-2 -mr-2">
          <Section date="2026-02-26">
            <Category
              icon="✨"
              title="새로운 기능"
              items={[
                '관리자 대시보드 - 마인드맵 관리 탭 추가 (전체 마인드맵 목록 조회, 검색, 제목 수정)',
                '내 프로필 수정 기능 추가 (이름, 팀, 전화번호 수정 가능)',
              ]}
            />
            <Category
              icon="🔧"
              title="개선사항"
              items={[
                '노드 텍스트 변경 단축키 F2→F3 변경',
              ]}
            />
          </Section>

          <Section date="2026-02-22">
            <Category
              icon="✨"
              title="새로운 기능"
              items={[
                '마인드맵 간 노드 복사/붙여넣기 지원 (하위 노드 포함 서브트리 전체 복사)',
                'dagre 기반 자동 레이아웃 엔진 도입 (노드 겹침 완전 해결)',
                '자동 정렬 옵션: 트리(하향) / 트리(우→좌) / 양쪽 방사형 레이아웃 지원',
                '앱 내 릴리즈 노트 확인 기능 추가',
                '하위 노드 숨김 시 상위 노드에 접힘 표시 아이콘 추가',
                '대시보드에서 마인드맵 복제(복사본 생성) 기능 추가',
              ]}
            />
            <Category
              icon="🔧"
              title="개선사항"
              items={[
                '노드 추가/삭제/재배치 시 자동으로 전체 트리 재정렬',
                '노드 드래그 후 부모 변경 시 자동 레이아웃 적용',
                '노드 크기(레벨, 텍스트 길이, 미디어) 기반 동적 간격 계산',
                '루트 노드 위치 고정 (앵커) 기능으로 레이아웃 변경 시 화면 점프 방지',
              ]}
            />
            <Category
              icon="🐛"
              title="버그 수정"
              items={[
                '형제 노드 재배치 시 React 불변 상태 업데이트 누락 수정',
                '노드 삭제 후 빈 공간이 자동으로 메워지지 않던 문제 해결',
                '상위 노드 삭제 시 하위 노드가 함께 삭제되지 않던 문제 해결',
                'PNG/SVG/PDF 내보내기 시 연결선이 표시되지 않던 문제 해결 (DOM 직접 변환 방식 적용)',
                '레이아웃 방향 변경 후 노드 추가/삭제 시 기본 하향으로 초기화되던 문제 해결',
                '우→좌 및 양쪽 방사형 레이아웃에서 연결선이 깔끔하지 않던 문제 해결',
              ]}
            />
          </Section>

          <Section date="2026-02-21">
            <Category
              icon="✨"
              title="새로운 기능"
              items={[
                '협업 기능 확장: 댓글, 변경 이력, 초대 링크, 권한 관리',
                'PNG/SVG/PDF/JSON 내보내기 및 JSON 가져오기 기능 추가',
                '노드에 이미지/영상 미디어 붙여넣기 지원',
                '연결선 화살표 엣지 스타일 선택 옵션 추가',
                '새 마인드맵 생성 시 기본 노드 10개 포함 템플릿 제공',
              ]}
            />
            <Category
              icon="🔧"
              title="개선사항"
              items={[
                '하위/형제 노드 좌우 균형 배치 (노드 밸런싱) 기능 추가',
                'Smoothstep 엣지 스타일 적용',
                'Shift+Enter 줄바꿈 입력 지원',
              ]}
            />
            <Category
              icon="🐛"
              title="버그 수정"
              items={[
                '내보내기 모달 및 히스토리 버튼 툴바 연결 수정',
                '내보내기 시 엣지가 보이지 않는 뷰포트 캡처 문제 해결',
                'ReactFlow 뷰포트 트랜스폼을 활용한 PNG/SVG/PDF 엣지 렌더링 수정',
                '사용자 액션에 대한 변경 이력 기록 연결 수정',
              ]}
            />
          </Section>

          <Section date="2026-02-20">
            <Category
              icon="✨"
              title="새로운 기능"
              items={[
                'Yjs + Hocuspocus 기반 실시간 공동작업 기능 구현',
                '커서 공유 및 협업자 관리 기능 추가',
              ]}
            />
            <Category
              icon="🐛"
              title="버그 수정"
              items={[
                'Railway 배포 호환성 수정 (Dockerfile, CORS, WebSocket)',
                'y-websocket v3.0.0 업그레이드로 Hocuspocus 호환성 확보',
              ]}
            />
          </Section>

          <Section date="2026-02-19">
            <Category
              icon="✨"
              title="새로운 기능"
              items={[
                '실시간 협업 마인드맵 애플리케이션 초기 버전 출시 (v3)',
                'Railway 배포 설정 및 마인드맵 기능 업데이트 (v4)',
              ]}
            />
            <Category
              icon="🔧"
              title="개선사항"
              items={[
                'WebSocket 서버 단독 운영으로 전환',
              ]}
            />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

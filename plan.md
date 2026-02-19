# 마인드맵 에디터 프론트엔드 수정

## Overview
현재 Tailwind CSS는 설치되어 있지만 ReactFlow 캔버스가 화면에 표시되지 않는 문제를 해결합니다. 노드가 렌더링되지만 보이지 않는 근본 원인은 컨테이너 높이 설정 문제입니다.

## Key Files
| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/MindMap/MindMapCanvas.tsx` | Modify | ReactFlow 컨테이너 높이 명시적 설정 |
| `frontend/src/hooks/useMindMapStore.ts` | Modify | 초기 노드 위치를 동적으로 계산 |
| `frontend/src/components/MindMap/CustomNode.tsx` | Modify | 노드 최소 크기 보장 |
| `frontend/src/index.css` | Modify | ReactFlow 전역 스타일 개선 |
| `frontend/src/pages/MindMapEditor.tsx` | Verify | 레이아웃 구조 확인 |

## Implementation Steps

### 1. ReactFlow 컨테이너 높이 수정
- **File**: `frontend/src/components/MindMap/MindMapCanvas.tsx`
- **Problem**: ReactFlow가 부모 높이를 인식하지 못함
- **Solution**:
  - 외부 div에 `className="absolute inset-0"` 추가
  - ReactFlow에 명시적 스타일 추가: `style={{ width: '100%', height: '100%' }}`
  - `fitView={false}` 설정 (초기 위치 제어)
  - `defaultViewport` 추가

### 2. 초기 노드 중앙 배치
- **File**: `frontend/src/hooks/useMindMapStore.ts`
- **Problem**: 루트 노드가 고정 좌표 (600, 300)에 있음
- **Solution**:
  - 윈도우 크기에 따라 동적 계산
  - 초기 줌 레벨 조정 (0.8 → 1.0)

### 3. 노드 가시성 개선
- **File**: `frontend/src/components/MindMap/CustomNode.tsx`
- **Problem**: 노드가 너무 작거나 투명할 수 있음
- **Solution**:
  - 최소 크기: `min-w-[120px] min-h-[40px]`
  - 명확한 border 추가
  - 배경색 opacity 보장

### 4. ReactFlow 전역 스타일
- **File**: `frontend/src/index.css`
- **Problem**: ReactFlow 캔버스가 축소될 수 있음
- **Solution**:
  - `.react-flow` 클래스에 최소 높이 추가
  - 배경 가시성 확보

### 5. 디버깅 정보 제거
- **File**: `frontend/src/components/MindMap/MindMapCanvas.tsx`
- **Action**: 작동 확인 후 노란색 디버그 박스 제거

## Dependencies
모든 필요한 패키지가 이미 설치됨:
- reactflow@11.11.4
- tailwindcss@3.4.0
- react@19.0.0

## Risks & Mitigations
- **Risk**: 수정 후에도 노드가 안 보일 수 있음
- **Mitigation**: 브라우저 콘솔에서 nodes 배열 확인, ReactFlow devtools 사용

- **Risk**: 레이아웃이 깨질 수 있음
- **Mitigation**: 각 변경사항을 단계별로 적용하고 테스트

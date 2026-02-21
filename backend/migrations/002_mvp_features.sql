-- MVP 필수 기능: settings 컬럼 추가
-- Migration: 002_mvp_features.sql

-- mind_maps 테이블에 settings 컬럼 추가
ALTER TABLE mind_maps
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "layout_algorithm": "manual",
  "edge_type": "bezier",
  "auto_layout": false,
  "spacing_x": 200,
  "spacing_y": 150
}'::jsonb;

-- settings 컬럼 인덱스 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_mind_maps_settings
ON mind_maps USING GIN (settings);

-- 기존 데이터에 기본 settings 추가 (NULL인 경우만)
UPDATE mind_maps
SET settings = '{
  "layout_algorithm": "manual",
  "edge_type": "bezier",
  "auto_layout": false,
  "spacing_x": 200,
  "spacing_y": 150
}'::jsonb
WHERE settings IS NULL;

-- 마이그레이션 완료 확인
DO $$
BEGIN
  RAISE NOTICE 'Migration 002_mvp_features.sql completed successfully';
END $$;

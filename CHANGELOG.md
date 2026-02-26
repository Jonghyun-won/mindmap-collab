# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Mind map chapter feature (Excel sheet-style)
  - Tab bar UI at the bottom of the editor
  - Add / delete / rename / reorder (drag) chapters
  - Duplicate chapter via right-click context menu
  - Each chapter has an independent node tree
  - Real-time collaboration (Yjs) per chapter
- Backend API: 7 chapter endpoints
  - `GET /mindmaps/{id}/chapters` - List chapters
  - `POST /mindmaps/{id}/chapters` - Create chapter
  - `GET /mindmaps/{id}/chapters/{chapter_id}` - Get chapter detail
  - `PUT /mindmaps/{id}/chapters/{chapter_id}` - Update chapter title
  - `DELETE /mindmaps/{id}/chapters/{chapter_id}` - Delete chapter
  - `PUT /mindmaps/{id}/chapters/reorder` - Reorder chapters
  - `POST /mindmaps/{id}/chapters/{chapter_id}/duplicate` - Duplicate chapter
- Database: `chapters` table with migration files
  - `008_chapters.sql` - Table creation
  - `009_migrate_existing_mindmaps_to_chapters.sql` - Data migration
- WebSocket: documentName format changed to `{mindmap_id}:{chapter_id}`
- API documentation (api.yaml) updated with Chapters section and schemas

### Changed
- Existing mind maps are automatically migrated to "Chapter 1"
- localStorage key format changed to `mindmap_{id}_chapter_{chapterId}`
- Yjs document separated per chapter

### Improved
- Loading spinner and animation on chapter switch
- Safety check preventing deletion of the last chapter
- Chapter title validation (non-empty, max 255 characters)

import { useState, useRef, useEffect } from 'react';

interface TitleEditorProps {
  initialTitle: string;
  onSave: (title: string) => void;
  isSaving?: boolean;
}

export default function TitleEditor({ initialTitle, onSave, isSaving }: TitleEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(initialTitle);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="px-3 py-1 text-lg font-semibold border-2 border-indigo-500 rounded focus:outline-none focus:border-indigo-600"
          placeholder="마인드맵 제목"
          maxLength={100}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-1 rounded transition-colors"
      title="클릭하여 제목 수정"
    >
      <h1 className="text-lg font-semibold text-gray-900">
        {title || 'Untitled Mind Map'}
      </h1>
      <span className="text-gray-400 text-sm">✏️</span>
      {isSaving && <span className="text-xs text-gray-500 animate-pulse">저장 중...</span>}
    </div>
  );
}

import { memo } from 'react';
import { UserPresence } from '../../hooks/usePresence';

interface CollaboratorCursorsProps {
  collaborators: Map<number, UserPresence>;
}

function CollaboratorCursors({ collaborators }: CollaboratorCursorsProps) {
  return (
    <>
      {Array.from(collaborators.values()).map((collaborator) => {
        if (!collaborator.cursor) return null;

        return (
          <div
            key={collaborator.clientId}
            className="absolute pointer-events-none z-50 transition-all duration-100"
            style={{
              left: `${collaborator.cursor.x}px`,
              top: `${collaborator.cursor.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* 커서 아이콘 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5 3L19 12L12 13L9 20L5 3Z"
                fill={collaborator.user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* 사용자 이름 */}
            <div
              className="absolute left-6 top-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: collaborator.user.color }}
            >
              {collaborator.user.name}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default memo(CollaboratorCursors);

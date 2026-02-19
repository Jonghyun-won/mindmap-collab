import { memo } from 'react';
import { UserPresence } from '../../hooks/usePresence';

interface CollaboratorAvatarsProps {
  collaborators: Map<number, UserPresence>;
  currentUserName?: string;
}

function CollaboratorAvatars({
  collaborators,
  currentUserName
}: CollaboratorAvatarsProps) {
  const collaboratorsList = Array.from(collaborators.values());

  return (
    <div className="flex items-center gap-2">
      {/* 현재 사용자 */}
      {currentUserName && (
        <div className="flex items-center gap-2 mr-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-lg"
            style={{ backgroundColor: '#6366f1' }}
            title={`${currentUserName} (나)`}
          >
            {currentUserName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-gray-700">{currentUserName}</span>
        </div>
      )}

      {/* 다른 협업자들 */}
      {collaboratorsList.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex -space-x-2">
            {collaboratorsList.map((collaborator) => (
              <div
                key={collaborator.clientId}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white shadow-lg"
                style={{ backgroundColor: collaborator.user.color }}
                title={collaborator.user.name}
              >
                {collaborator.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(CollaboratorAvatars);

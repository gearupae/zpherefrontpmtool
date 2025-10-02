import React from 'react';
import ContextCardsSystem from './ContextCardsSystem';

interface ContextCardsWidgetProps {
  projectId: string;
}

const ContextCardsWidget: React.FC<ContextCardsWidgetProps> = ({ projectId }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Context Cards</h3>
        <p className="text-sm text-gray-600">Capture the WHY behind project decisions</p>
      </div>
      <div className="p-6">
        <ContextCardsSystem 
          linkedEntityId={projectId}
          linkedEntityType="project"
          showCreateButton={true}
          compact={true}
        />
      </div>
    </div>
  );
};

export default ContextCardsWidget;
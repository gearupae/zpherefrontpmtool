import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task, Project } from '../../types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  items: (Task | Project)[];
  type: 'tasks' | 'projects';
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color,
  items,
  type,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className={`${color} rounded-md py-2 mb-2`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-semibold text-white">{title}</h3>
          <span className="bg-white/90 px-2 py-0.5 rounded-full text-xs md:text-sm font-medium text-gray-800">
            {items.length}
          </span>
        </div>
      </div>
      
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-96 p-1 rounded-lg border-2 border-dashed transition-colors ${
          isOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {items.map(item => (
              <KanbanCard
                key={item.id}
                item={item}
                type={type}
              />
            ))}
            {items.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">Drop {type} here</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;


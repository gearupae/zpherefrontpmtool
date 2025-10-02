import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
} from '@dnd-kit/sortable';
import { Task, TaskStatus, Project, ProjectStatus } from '../../types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  tasks?: Task[];
  projects?: Project[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onProjectUpdate?: (projectId: string, updates: Partial<Project>) => void;
  type: 'tasks' | 'projects';
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks = [],
  projects = [],
  onTaskUpdate,
  onProjectUpdate,
  type,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Define columns based on type
  const columns = useMemo(() => {
    if (type === 'tasks') {
      return [
        { id: TaskStatus.TODO, title: 'To Do', color: 'bg-gradient-to-r from-violet-600 to-fuchsia-600' },
        { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'bg-gradient-to-r from-sky-600 to-blue-600' },
        { id: TaskStatus.IN_REVIEW, title: 'In Review', color: 'bg-gradient-to-r from-amber-500 to-orange-600' },
        { id: TaskStatus.BLOCKED, title: 'Blocked', color: 'bg-gradient-to-r from-rose-600 to-red-600' },
        { id: TaskStatus.COMPLETED, title: 'Completed', color: 'bg-gradient-to-r from-emerald-600 to-teal-600' },
      ] as const;
    } else {
      return [
        { id: ProjectStatus.PLANNING, title: 'Planning', color: 'bg-gradient-to-r from-indigo-600 to-violet-600' },
        { id: ProjectStatus.ACTIVE, title: 'Active', color: 'bg-gradient-to-r from-green-600 to-lime-600' },
        { id: ProjectStatus.ON_HOLD, title: 'On Hold', color: 'bg-gradient-to-r from-amber-500 to-yellow-600' },
        { id: ProjectStatus.COMPLETED, title: 'Completed', color: 'bg-gradient-to-r from-teal-600 to-emerald-600' },
        { id: ProjectStatus.CANCELLED, title: 'Cancelled', color: 'bg-gradient-to-r from-rose-600 to-red-600' },
      ] as const;
    }
  }, [type]);

  // Group items by status
  const groupedItems = useMemo(() => {
    const grouped: Record<string, (Task | Project)[]> = {};
    
    columns.forEach(column => {
      if (type === 'tasks') {
        grouped[column.id] = tasks.filter((item: Task) => item.status === column.id);
      } else {
        grouped[column.id] = projects.filter((item: Project) => item.status === column.id);
      }
    });
    
    return grouped;
  }, [type, tasks, projects, columns]);

  const findContainer = (id: string) => {
    if (type === 'tasks') {
      const task = tasks.find(t => t.id === id);
      return task?.status || null;
    } else {
      const project = projects.find(p => p.id === id);
      return project?.status || null;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = overId in Object.fromEntries(columns.map(col => [col.id, true])) ? overId : findContainer(overId);

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    // Update the item's status
    if (type === 'tasks' && onTaskUpdate) {
      onTaskUpdate(activeId, { status: overContainer as TaskStatus });
    } else if (type === 'projects' && onProjectUpdate) {
      onProjectUpdate(activeId, { status: overContainer as ProjectStatus });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (activeContainer === overContainer) {
      const activeIndex = groupedItems[activeContainer].findIndex((item: any) => item.id === activeId);
      const overIndex = groupedItems[overContainer].findIndex((item: any) => item.id === overId);

      if (activeIndex !== overIndex) {
        const newItems = arrayMove(groupedItems[activeContainer], activeIndex, overIndex);
        // Here you could update the position order if needed
        console.log('Reordered items within same container:', newItems);
      }
    }

    setActiveId(null);
  };

  const renderActiveItem = () => {
    if (!activeId) return null;

    if (type === 'tasks') {
      const task = tasks.find(t => t.id === activeId);
      return task ? <KanbanCard item={task} type="tasks" isDragging /> : null;
    } else {
      const project = projects.find(p => p.id === activeId);
      return project ? <KanbanCard item={project} type="projects" isDragging /> : null;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-2 w-full min-w-max">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            items={groupedItems[column.id] || []}
            type={type}
          />
        ))}
        </div>
      </div>
      
      <DragOverlay>
        {renderActiveItem()}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Customer } from '../../types';
import CustomerKanbanCard from './CustomerKanbanCard';

interface CustomerKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  customers: Customer[];
}

const CustomerKanbanColumn: React.FC<CustomerKanbanColumnProps> = ({
  id,
  title,
  color,
  customers,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className={`${color} rounded-md px-3 py-2 mb-2`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm md:text-base font-semibold text-white">{title}</h3>
          <span className="bg-white/90 px-2 py-0.5 rounded-full text-xs md:text-sm font-medium text-gray-800">
            {customers.length}
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
          items={customers.map(customer => customer.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {customers.map(customer => (
              <CustomerKanbanCard
                key={customer.id}
                customer={customer}
              />
            ))}
            {customers.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-sm">Drop customers here</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};

export default CustomerKanbanColumn;

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
import { Customer } from '../../types';
import CustomerKanbanColumn from './CustomerKanbanColumn';
import CustomerKanbanCard from './CustomerKanbanCard';

interface CustomerKanbanBoardProps {
  customers: Customer[];
  onCustomerUpdate: (customerId: string, updates: Partial<Customer>) => void;
}

const CustomerKanbanBoard: React.FC<CustomerKanbanBoardProps> = ({
  customers,
  onCustomerUpdate,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Define columns based on customer types
  const columns = useMemo(() => [
    { id: 'client', title: 'Client', color: 'bg-gradient-to-r from-green-600 to-emerald-600' },
    { id: 'prospect', title: 'Prospect', color: 'bg-gradient-to-r from-sky-600 to-blue-600' },
    { id: 'lead', title: 'Lead', color: 'bg-gradient-to-r from-amber-500 to-orange-600' },
    { id: 'inactive', title: 'Inactive', color: 'bg-gradient-to-r from-gray-500 to-gray-700' },
    { id: 'other', title: 'Other', color: 'bg-gradient-to-r from-slate-500 to-slate-700' },
  ], []);

  // Group customers by customer_type
  const groupedCustomers = useMemo(() => {
    const grouped: Record<string, Customer[]> = {};
    
    columns.forEach(column => {
      grouped[column.id] = customers.filter((customer: Customer) => {
        const type = String(customer.customer_type || '').toLowerCase();
        if (column.id === 'other') {
          return !['client', 'prospect', 'lead', 'inactive'].includes(type);
        }
        return type === column.id;
      });
    });
    
    return grouped;
  }, [customers, columns]);

  const findContainer = (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return null;
    
    const type = String(customer.customer_type || '').toLowerCase();
    if (['client', 'prospect', 'lead', 'inactive'].includes(type)) {
      return type;
    }
    return 'other';
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
    const overContainer = overId in Object.fromEntries(columns.map(col => [col.id, true])) 
      ? overId 
      : findContainer(overId);

    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    // Update the customer's type
    onCustomerUpdate(activeId, { customer_type: overContainer });
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
      const activeIndex = groupedCustomers[activeContainer].findIndex((customer: Customer) => customer.id === activeId);
      const overIndex = groupedCustomers[overContainer].findIndex((customer: Customer) => customer.id === overId);

      if (activeIndex !== overIndex) {
        const newCustomers = arrayMove(groupedCustomers[activeContainer], activeIndex, overIndex);
        // Here you could update the position order if needed
        console.log('Reordered customers within same container:', newCustomers);
      }
    }

    setActiveId(null);
  };

  const renderActiveCustomer = () => {
    if (!activeId) return null;

    const customer = customers.find(c => c.id === activeId);
    return customer ? <CustomerKanbanCard customer={customer} isDragging /> : null;
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
          <CustomerKanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            customers={groupedCustomers[column.id] || []}
          />
        ))}
        </div>
      </div>
      
      <DragOverlay>
        {renderActiveCustomer()}
      </DragOverlay>
    </DndContext>
  );
};

export default CustomerKanbanBoard;

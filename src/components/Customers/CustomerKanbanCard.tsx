import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Customer } from '../../types';
import {
 BuildingOfficeIcon,
 EnvelopeIcon,
 PhoneIcon,
} from '@heroicons/react/24/outline';

interface CustomerKanbanCardProps {
 customer: Customer;
 isDragging?: boolean;
}

const CustomerKanbanCard: React.FC<CustomerKanbanCardProps> = ({ customer, isDragging = false }) => {
 const navigate = useNavigate();
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 active,
 } = useSortable({ id: customer.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 opacity: isDragging ? 0.8 : 1,
 willChange: 'transform',
 };

 const getStatusColor = (isActive: boolean) => {
 return isActive 
 ? 'bg-green-50 text-green-700 border border-green-200'
 : 'bg-red-50 text-red-700 border border-red-200';
 };

 const formatCurrency = (amount: number | undefined | null, currency: string = 'USD'): string => {
 if (amount === undefined || amount === null) return '$0.00';
 
 try {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 2,
 maximumFractionDigits: 2
 }).format(amount / 100);
 } catch (error) {
 return `$${(amount / 100).toFixed(2)}`;
 }
 };

 const handleCardClick = (e: React.MouseEvent) => {
 // Prevent click during drag
 if (active?.id === customer.id) return;
 
 e.stopPropagation();
 navigate(`/customers/${customer.id}`);
 };

 return (
 <div
 ref={setNodeRef}
 style={style}
 {...attributes}
 {...listeners}
 onClick={handleCardClick}
 className={`w-full block bg-white rounded-md shadow-sm border p-3 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
 active?.id === customer.id ? 'ring-2 ring-blue-400' : ''
 }`}
 >
 {/* Header with avatar */}
 <div className="flex items-center mb-3">
 <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
 <span className="text-sm font-medium text-user-blue">
 {customer.first_name?.[0]}{customer.last_name?.[0]}
 </span>
 </div>
 <div className="ml-3 min-w-0 flex-1">
 <div className="text-sm font-semibold text-gray-900 truncate">
 {customer.full_name}
 </div>
 {customer.job_title && (
 <div className="text-xs text-gray-600 truncate">
 {customer.job_title}
 </div>
 )}
 </div>
 </div>

 {/* Company info */}
 {customer.company_name && (
 <div className="flex items-center gap-1.5 mb-2">
 <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
 <span className="text-xs text-gray-700 truncate">{customer.company_name}</span>
 </div>
 )}

 {/* Contact info */}
 <div className="space-y-1 mb-3">
 <div className="flex items-center gap-1.5">
 <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
 <span className="text-xs text-gray-600 truncate">{customer.email}</span>
 </div>
 {customer.phone && (
 <div className="flex items-center gap-1.5">
 <PhoneIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
 <span className="text-xs text-gray-600 truncate">{customer.phone}</span>
 </div>
 )}
 </div>

 {/* Status badge */}
 <div className="flex items-center justify-between mb-2">
 <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(customer.is_active)}`}>
 {customer.is_active ? 'Active' : 'Inactive'}
 </span>
 </div>

 {/* Stats */}
 <div className="flex items-center justify-between gap-2 text-[10px]">
 <div className="flex gap-1">
 <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
 Proj {customer.projects_count ?? 0}
 </span>
 <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
 Inv {customer.invoiced_count ?? 0}
 </span>
 </div>
 {(customer.pending_invoices_count ?? 0) > 0 && (
 <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium">
 Pend {customer.pending_invoices_count}
 </span>
 )}
 </div>

 {/* Due amount */}
 {(customer.due_amount ?? 0) > 0 && (
 <div className="mt-2 pt-2 border-t border-gray-100">
 <div className="text-xs text-red-600 font-semibold">
 Due: {formatCurrency(customer.due_amount)}
 </div>
 </div>
 )}
 </div>
 );
};

export default CustomerKanbanCard;

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { 
 BuildingOffice2Icon, 
 DocumentTextIcon, 
 CurrencyDollarIcon,
 ExclamationTriangleIcon,

 PlusIcon,
 MagnifyingGlassIcon,

 EyeIcon,
 PencilIcon,
 TrashIcon,
 DocumentArrowDownIcon,

 ClockIcon,
 ArrowPathIcon,
 CalendarIcon,
 FunnelIcon,
 CheckIcon,
 ChevronUpIcon,
 ChevronDownIcon
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
import { getTenantRoute } from '../../utils/tenantUtils';
import { Item } from '../../types';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import '../Projects/FilterButtons.css';
import InvoiceItemsTable, { InvoiceRow as POInvoiceRow } from '../../components/Invoices/InvoiceItemsTable';

interface PurchaseStats {
 totalOrders: number;
 pendingOrders: number;
 approvedOrders: number;
 receivedOrders: number;
 totalSpent: number;
 averageOrderValue: number;
 totalVendors: number;
 activeVendors: number;
 dueAmountTotal: number;
}

interface Vendor {
 id: string;
 name: string;
 email: string;
 phone: string;
 address: string;
 city: string;
 state: string;
 country: string;
 postal_code: string;
 tax_id: string;
 payment_terms: string;
 credit_limit: number;
 category?: string;
 is_active: boolean;
 created_at: string;
 // Computed fields
 total_purchases?: number;
 due_amount?: number;
 total_invoices?: number;
}

interface PurchaseOrder {
 id: string;
 po_number: string;
 vendor_id: string;
 project_id?: string;
 customer_id?: string;
 status: 'pending' | 'approved' | 'received' | 'cancelled';
 delivery_status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
 payment_status?: 'pending' | 'paid' | 'partial' | 'overdue';
 order_date: string;
 expected_delivery_date?: string;
 received_date?: string;
 total_amount: number;
 notes?: string;
 items: PurchaseOrderItem[];
 created_at: string;
 updated_at: string;
}

interface PurchaseOrderItem {
 id?: string;
 name: string;
 description?: string;
 quantity: number;
 unit_price: number;
 total_price: number;
}

// Portal component for rendering filter popups outside table overflow context
const FilterPortal: React.FC<{ children: React.ReactNode; buttonRect: DOMRect | null; alignRight?: boolean }> = ({ children, buttonRect, alignRight = false }) => {
 if (!buttonRect) return null;
 
 // For right-aligned popups (like date filter), position to the right of the button
 const leftPosition = alignRight ? buttonRect.right : buttonRect.left;
 
 return ReactDOM.createPortal(
 <div
 style={{
 position: 'fixed',
 left: `${leftPosition}px`,
 top: `${buttonRect.bottom + 4}px`,
 zIndex: 2147483647, // Maximum safe z-index value
 transform: alignRight ? 'translateX(-100%)' : 'none',
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {children}
 </div>,
 document.body
 );
};

// Portal for inline edit popovers
const InlineEditPortal: React.FC<{ children: React.ReactNode; rect: DOMRect | null }> = ({ children, rect }) => {
 if (!rect) return null;
 return ReactDOM.createPortal(
 <div
 style={{
 position: 'fixed',
 left: `${rect.left}px`,
 top: `${rect.bottom + 4}px`,
 zIndex: 2147483647, // Maximum safe z-index value
 }}
 onClick={(e) => e.stopPropagation()}
 >
 {children}
 </div>,
 document.body
 );
};

const PurchasePage: React.FC = () => {
 const navigate = useNavigate();
 const dispatch = useAppDispatch();
 const { user } = useAppSelector((state) => state.auth);
 const [activeTab, setActiveTab] = useState<'purchase-orders' | 'vendors'>('purchase-orders');
 const [showCreatePO, setShowCreatePO] = useState(false);
 const [showCreateVendor, setShowCreateVendor] = useState(false);
 const [stats, setStats] = useState<PurchaseStats>({
 totalOrders: 0,
 pendingOrders: 0,
 approvedOrders: 0,
 receivedOrders: 0,
 totalSpent: 0,
 averageOrderValue: 0,
 totalVendors: 0,
 activeVendors: 0,
 dueAmountTotal: 0,
 });
 const [vendors, setVendors] = useState<Vendor[]>([]);
 const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
 const [vendorStats, setVendorStats] = useState<Record<string, { purchases: number; dueAmount: number; invoices: number }>>({});
 const [itemsCatalog, setItemsCatalog] = useState<Item[]>([]);
 const [projects, setProjects] = useState<Array<{id: string; name: string}>>([]);
 const [customers, setCustomers] = useState<Array<{id: string; first_name?: string; last_name?: string; company_name?: string}>>([]);
 const [orgUsers, setOrgUsers] = useState<Array<{id: string; full_name: string}>>([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [vendorSearchTerm, setVendorSearchTerm] = useState('');
 
 // Vendor date filter state
 const [vendorFilterFromDate, setVendorFilterFromDate] = useState('');
 const [vendorFilterToDate, setVendorFilterToDate] = useState('');
 const [pendingVendorFrom, setPendingVendorFrom] = useState('');
 const [pendingVendorTo, setPendingVendorTo] = useState('');
 const [vendorDateOpen, setVendorDateOpen] = useState(false);
 const vendorDateRef = useRef<HTMLDivElement | null>(null);
 
 // Vendor header filter state
 const [vendorHeaderFilterOpen, setVendorHeaderFilterOpen] = useState<null | 'status' | 'country'>(null);
 const [vendorFilterButtonRect, setVendorFilterButtonRect] = useState<DOMRect | null>(null);
 const vendorHeaderFilterRef = useRef<HTMLDivElement | null>(null);
 const [filterVendorStatus, setFilterVendorStatus] = useState<boolean[]>([]); // true=active, false=inactive
 const [filterVendorCountries, setFilterVendorCountries] = useState<string[]>([]);
 
 // Inline editing state for POs
 const [editingPOId, setEditingPOId] = useState<string | null>(null);
 const [editingField, setEditingField] = useState<'delivery_status' | 'payment_status' | null>(null);
 const [editValue, setEditValue] = useState<any>(null);
 const [inlineEditRect, setInlineEditRect] = useState<DOMRect | null>(null);
 const inlinePopoverRef = useRef<HTMLDivElement | null>(null);
 
 // PO header filter state
 const [poHeaderFilterOpen, setPoHeaderFilterOpen] = useState<null | 'status' | 'delivery_status' | 'payment_status' | 'vendor'>(null);
 const [poFilterButtonRect, setPoFilterButtonRect] = useState<DOMRect | null>(null);
 const poHeaderFilterRef = useRef<HTMLDivElement | null>(null);
 const [filterPOStatus, setFilterPOStatus] = useState<string[]>([]);
 const [filterDeliveryStatus, setFilterDeliveryStatus] = useState<string[]>([]);
 const [filterPaymentStatus, setFilterPaymentStatus] = useState<string[]>([]);
 const [filterPOVendorIds, setFilterPOVendorIds] = useState<string[]>([]);
 
 // PO date filter state
 const [poFilterFromDate, setPoFilterFromDate] = useState('');
 const [poFilterToDate, setPoFilterToDate] = useState('');
 const [pendingPoFrom, setPendingPoFrom] = useState('');
 const [pendingPoTo, setPendingPoTo] = useState('');
 const [poDateOpen, setPoDateOpen] = useState(false);
 const poDateRef = useRef<HTMLButtonElement | null>(null);
 
 // Inline editing state for Vendors
 const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
 const [editingVendorField, setEditingVendorField] = useState<'status' | null>(null);
 const [editVendorValue, setEditVendorValue] = useState<any>(null);
 const [vendorInlineEditRect, setVendorInlineEditRect] = useState<DOMRect | null>(null);
 const vendorInlinePopoverRef = useRef<HTMLDivElement | null>(null);
 
 // PO sorting state
 const [poSortField, setPoSortField] = useState<'status' | 'delivery_status' | 'payment_status' | 'order_date' | 'expected_delivery_date' | 'received_date' | null>(null);
 const [poSortDir, setPoSortDir] = useState<'asc' | 'desc'>('asc');
 
 // Vendor sorting state
 const [vendorSortField, setVendorSortField] = useState<'purchases' | 'due_amount' | 'invoices' | 'status' | null>(null);
 const [vendorSortDir, setVendorSortDir] = useState<'asc' | 'desc'>('asc');

 // Create Purchase Order Form State
 const [newPO, setNewPO] = useState({
 vendor_id: '',
 project_id: '',
 customer_id: '',
 expected_delivery_date: '',
 received_date: '',
 requested_by: 'System User',
 notes: '',
 items: [{ name: '', quantity: 1, unit_price: 0 }] as Array<{name: string, quantity: number, unit_price: number, description?: string}>
 });
 // Use the same row structure as Invoice items for consistent behavior (search, pick, auto-append)
 const [poItems, setPoItems] = useState<POInvoiceRow[]>([
 { item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }
 ]);
 const [isCreatingPO, setIsCreatingPO] = useState(false);

// Create Vendor Form State
 const [newVendor, setNewVendor] = useState({
 name: '',
 email: '',
 phone: '',
 address: '',
 city: '',
 state: '',
 country: '',
 postal_code: '',
 tax_id: '',
 // Backend expects lowercase enum values (e.g., 'net_30')
 payment_terms: 'net_30',
 credit_limit: 0,
 });

 // Vendor attachments (copied pattern from Customers create form)
 type VendorAttachmentItem = { id: number; file?: File };
 const [vendorAttachments, setVendorAttachments] = useState<VendorAttachmentItem[]>([]);

 // PO sorting function
 const onPOHeaderDblClick = (field: 'status' | 'delivery_status' | 'payment_status' | 'order_date' | 'expected_delivery_date' | 'received_date') => {
 if (poSortField === field) {
 setPoSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
 } else {
 setPoSortField(field);
 setPoSortDir('asc');
 }
 };

 // Filtered and sorted purchase orders
 const filteredPurchaseOrders = React.useMemo(() => {
 let arr = [...purchaseOrders];
 
 // Apply search filter
 if (searchTerm.trim()) {
 arr = arr.filter(po => 
 po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
 vendors.find(v => v.id === po.vendor_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
 );
 }
 
 // Apply status filter
 if (filterPOStatus.length > 0) {
 arr = arr.filter(po => filterPOStatus.includes(po.status));
 }
 
 // Apply delivery status filter
 if (filterDeliveryStatus.length > 0) {
 arr = arr.filter(po => filterDeliveryStatus.includes(po.delivery_status || 'pending'));
 }
 
 // Apply payment status filter
 if (filterPaymentStatus.length > 0) {
 arr = arr.filter(po => filterPaymentStatus.includes(po.payment_status || 'pending'));
 }

 // Apply vendor filter
 if (filterPOVendorIds.length > 0) {
 arr = arr.filter(po => filterPOVendorIds.includes(po.vendor_id));
 }
 
 // Apply sorting
 if (poSortField) {
 const statusOrder: Record<string, number> = { pending: 1, approved: 2, received: 3, cancelled: 4 };
 const deliveryOrder: Record<string, number> = { pending: 1, in_transit: 2, delivered: 3, cancelled: 4 };
 const paymentOrder: Record<string, number> = { pending: 1, partial: 2, paid: 3, overdue: 4 };
 
 arr.sort((a, b) => {
 let av: any = 0;
 let bv: any = 0;
 
 switch (poSortField) {
 case 'status':
 av = statusOrder[a.status] ?? 0;
 bv = statusOrder[b.status] ?? 0;
 break;
 case 'delivery_status':
 av = deliveryOrder[a.delivery_status || 'pending'] ?? 0;
 bv = deliveryOrder[b.delivery_status || 'pending'] ?? 0;
 break;
 case 'payment_status':
 av = paymentOrder[a.payment_status || 'pending'] ?? 0;
 bv = paymentOrder[b.payment_status || 'pending'] ?? 0;
 break;
 case 'order_date':
 av = new Date(a.order_date).getTime();
 bv = new Date(b.order_date).getTime();
 break;
 case 'expected_delivery_date':
 av = a.expected_delivery_date ? new Date(a.expected_delivery_date).getTime() : 0;
 bv = b.expected_delivery_date ? new Date(b.expected_delivery_date).getTime() : 0;
 break;
 case 'received_date':
 av = a.received_date ? new Date(a.received_date).getTime() : 0;
 bv = b.received_date ? new Date(b.received_date).getTime() : 0;
 break;
 }
 
 if (av < bv) return poSortDir === 'asc' ? -1 : 1;
 if (av > bv) return poSortDir === 'asc' ? 1 : -1;
 return 0;
 });
 }
 
 return arr;
 }, [purchaseOrders, searchTerm, filterPOStatus, filterDeliveryStatus, filterPaymentStatus, vendors, poSortField, poSortDir]);

 // Filtered and sorted vendors
 const filteredVendors = React.useMemo(() => {
 let arr = [...vendors];
 
 // Apply search filter
 if (vendorSearchTerm.trim()) {
 arr = arr.filter(vendor =>
 vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
 vendor.email.toLowerCase().includes(vendorSearchTerm.toLowerCase())
 );
 }
 
 // Apply status filter
 if (filterVendorStatus.length > 0) {
 arr = arr.filter(vendor => filterVendorStatus.includes(vendor.is_active));
 }
 
 // Apply country filter
 if (filterVendorCountries.length > 0) {
 arr = arr.filter(vendor => vendor.country && filterVendorCountries.includes(vendor.country));
 }
 
 return arr;
 }, [vendors, vendorSearchTerm, filterVendorStatus, filterVendorCountries]);

 // Inline edit handlers
 const startInlineEdit = (e: React.MouseEvent, po: PurchaseOrder, field: 'delivery_status' | 'payment_status') => {
 e.stopPropagation();
 const target = e.currentTarget as HTMLElement;
 if (target && typeof target.getBoundingClientRect === 'function') {
 setInlineEditRect(target.getBoundingClientRect());
 } else {
 setInlineEditRect(null);
 }
 setEditingPOId(po.id);
 setEditingField(field);
 if (field === 'delivery_status') setEditValue(po.delivery_status || 'pending');
 if (field === 'payment_status') setEditValue(po.payment_status || 'pending');
 };

 const saveInlineEdit = async (poId: string, valueOverride?: any) => {
 try {
 if (!editingField) return;
 const value = valueOverride !== undefined ? valueOverride : editValue;
 const fieldName = editingField; // Store before reset
 
 // Build update and call appropriate backend endpoint
 const mapDeliveryToPOStatus: Record<string, string> = {
 pending: 'pending',
 in_transit: 'ordered',
 delivered: 'received',
 cancelled: 'cancelled',
 };

 let updateData: any = {};
 if (editingField === 'delivery_status') {
 updateData = { status: mapDeliveryToPOStatus[String(value)] || 'pending' };
 } else if (editingField === 'payment_status') {
 updateData = { payment_status: value };
 }
 
 // Reset state immediately
 setEditingPOId(null);
 setEditingField(null);
 setEditValue(null);
 setInlineEditRect(null);
 
 // Make API call
 if (editingField === 'delivery_status') {
 await apiClient.patch(`/purchase-orders/${poId}/status`, { status: updateData.status });
 // Update local state: reflect both status and mapped delivery flag for UI
 setPurchaseOrders(prev => prev.map(po => 
 po.id === poId ? { ...po, status: updateData.status, delivery_status: value } : po
 ));
 } else if (editingField === 'payment_status') {
 await apiClient.put(`/purchase-orders/${poId}`, { payment_status: value });
 setPurchaseOrders(prev => prev.map(po => 
 po.id === poId ? { ...po, payment_status: value as any } : po
 ));
 }
 
 dispatch(addNotification({
 type: 'success',
 title: 'Updated',
 message: fieldName === 'delivery_status' 
 ? 'Delivery status updated successfully'
 : 'Payment status updated successfully',
 duration: 3000,
 }));
 } catch (err) {
 console.error('Inline save failed:', err);
 dispatch(addNotification({
 type: 'error',
 title: 'Update Failed',
 message: 'Failed to update status',
 duration: 4000,
 }));
 }
 };

 const cancelInlineEdit = (e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingPOId(null);
 setEditingField(null);
 setEditValue(null);
 setInlineEditRect(null);
 };
 
 // Vendor inline edit handlers
 const startVendorInlineEdit = (e: React.MouseEvent, vendor: Vendor, field: 'status') => {
 e.stopPropagation();
 const target = e.currentTarget as HTMLElement;
 if (target && typeof target.getBoundingClientRect === 'function') {
 setVendorInlineEditRect(target.getBoundingClientRect());
 } else {
 setVendorInlineEditRect(null);
 }
 setEditingVendorId(vendor.id);
 setEditingVendorField(field);
 if (field === 'status') setEditVendorValue(vendor.is_active);
 };
 
 const saveVendorInlineEdit = async (vendorId: string, valueOverride?: any) => {
 try {
 if (!editingVendorField) return;
 const value = valueOverride !== undefined ? valueOverride : editVendorValue;
 
 const updateData: any = {};
 if (editingVendorField === 'status') {
 updateData.is_active = value;
 }
 
 // Reset state immediately
 setEditingVendorId(null);
 setEditingVendorField(null);
 setEditVendorValue(null);
 setVendorInlineEditRect(null);
 
 // Make API call (vendors use PUT for update)
 await apiClient.put(`/vendors/${vendorId}`, updateData);
 
 // Update local state
 setVendors(prev => prev.map(v => 
 v.id === vendorId ? { ...v, ...updateData } : v
 ));
 
 dispatch(addNotification({
 type: 'success',
 title: 'Updated',
 message: 'Vendor status updated successfully',
 duration: 3000,
 }));
 } catch (err) {
 console.error('Inline save failed:', err);
 dispatch(addNotification({
 type: 'error',
 title: 'Update Failed',
 message: 'Failed to update vendor status',
 duration: 4000,
 }));
 }
 };
 
 const cancelVendorInlineEdit = (e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingVendorId(null);
 setEditingVendorField(null);
 setEditVendorValue(null);
 setVendorInlineEditRect(null);
 };
 
 const onVendorHeaderDblClick = (field: 'purchases' | 'due_amount' | 'invoices' | 'status') => {
 if (vendorSortField === field) {
 setVendorSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
 } else {
 setVendorSortField(field);
 setVendorSortDir('asc');
 }
 };
 
 // Sorted and filtered vendors
 const displayedVendors = React.useMemo(() => {
 let arr = [...filteredVendors];
 
 if (!vendorSortField) return arr;
 
 arr.sort((a, b) => {
 let av: any = 0;
 let bv: any = 0;
 
 switch (vendorSortField) {
 case 'purchases':
 av = vendorStats[a.id]?.purchases || 0;
 bv = vendorStats[b.id]?.purchases || 0;
 break;
 case 'due_amount':
 av = vendorStats[a.id]?.dueAmount || 0;
 bv = vendorStats[b.id]?.dueAmount || 0;
 break;
 case 'invoices':
 av = vendorStats[a.id]?.invoices || 0;
 bv = vendorStats[b.id]?.invoices || 0;
 break;
 case 'status':
 av = a.is_active ? 1 : 0;
 bv = b.is_active ? 1 : 0;
 break;
 }
 
 if (av < bv) return vendorSortDir === 'asc' ? -1 : 1;
 if (av > bv) return vendorSortDir === 'asc' ? 1 : -1;
 return 0;
 });
 
 return arr;
 }, [filteredVendors, vendorSortField, vendorSortDir, vendorStats]);

 // Calculate vendor statistics from purchase orders
 const calculateVendorStats = (vendors: Vendor[], purchaseOrders: PurchaseOrder[]) => {
 const stats: Record<string, { purchases: number; dueAmount: number; invoices: number }> = {};
 
 vendors.forEach(vendor => {
 const vendorPOs = purchaseOrders.filter(po => po.vendor_id === vendor.id);
 const purchases = vendorPOs.length;
 
 // Calculate due amount (unpaid or partial payment orders)
 const dueAmount = vendorPOs
 .filter(po => po.payment_status === 'pending' || po.payment_status === 'partial')
 .reduce((sum, po) => sum + (po.total_amount || 0), 0);
 
 // For now, invoices = number of received POs (assuming received POs generate invoices)
 const invoices = vendorPOs.filter(po => po.status === 'received').length;
 
 stats[vendor.id] = { purchases, dueAmount, invoices };
 });
 
 return stats;
 };

 // Document click listener for closing popups
 useEffect(() => {
 const onDocClick = (e: MouseEvent) => {
 const target = e.target as Node;
 
 // Close inline edit popovers when clicking outside
 if (editingPOId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
 cancelInlineEdit();
 }
 
 // Close vendor inline edit popovers
 if (editingVendorId && vendorInlinePopoverRef.current && !vendorInlinePopoverRef.current.contains(target)) {
 cancelVendorInlineEdit();
 }
 
 // Close vendor date popover
 if (vendorDateOpen && vendorDateRef.current && !vendorDateRef.current.contains(target)) {
 setVendorDateOpen(false);
 }
 
 // Close PO header filter popover
 if (poHeaderFilterOpen && poHeaderFilterRef.current && !poHeaderFilterRef.current.contains(target)) {
 setPoHeaderFilterOpen(null);
 }
 
 // Close PO date popover
 if (poDateOpen && poDateRef.current && !poDateRef.current.contains(target)) {
 setPoDateOpen(false);
 }
 
 // Close vendor header filter popover
 if (vendorHeaderFilterOpen && vendorHeaderFilterRef.current && !vendorHeaderFilterRef.current.contains(target)) {
 setVendorHeaderFilterOpen(null);
 }
 };
 document.addEventListener('mousedown', onDocClick);
 return () => document.removeEventListener('mousedown', onDocClick);
 }, [editingPOId, editingVendorId, vendorDateOpen, poHeaderFilterOpen, poDateOpen, vendorHeaderFilterOpen]);

 // Fetch data
 useEffect(() => {
 fetchData();
 }, []);

const fetchData = async () => {
 try {
 // Fetch vendors
 const vendorsResponse = await apiClient.get('/vendors/');
 const vendorsData = Array.isArray(vendorsResponse.data)
 ? vendorsResponse.data
 : (vendorsResponse.data?.vendors || []);
 setVendors(vendorsData);

 // Fetch purchase orders
 const poResponse = await apiClient.get('/purchase-orders/');
 const poData = Array.isArray(poResponse.data)
 ? poResponse.data
 : (poResponse.data?.purchase_orders || []);
 setPurchaseOrders(poData);

 // Fetch items catalog (active billable items)
 try {
 const itemsResponse = await apiClient.get('/items/');
 const itemsData = itemsResponse.data.items || itemsResponse.data || [];
 setItemsCatalog(Array.isArray(itemsData) ? itemsData.filter((it: any) => it.is_active && it.is_billable) : []);
 } catch (e) {
 setItemsCatalog([]);
 }

 // Fetch projects
 try {
 const projectsResponse = await apiClient.get('/projects/');
 const projData = projectsResponse.data?.projects || projectsResponse.data || [];
 setProjects(Array.isArray(projData) ? projData.map((p: any) => ({ id: p.id, name: p.name || p.slug || 'Untitled Project' })) : []);
 } catch (e) {
 setProjects([]);
 }

 // Fetch customers
 try {
 const customersResponse = await apiClient.get('/customers/');
 const custData = customersResponse.data?.customers || customersResponse.data || [];
 setCustomers(Array.isArray(custData) ? custData : []);
 } catch (e) {
 setCustomers([]);
 }

 // Fetch users for Ordered By select
 try {
 const usersResponse = await apiClient.get('/users/');
 const rawUsers = usersResponse.data || [];
 const mapped = Array.isArray(rawUsers)
 ? rawUsers.map((u: any) => ({ id: u.id, full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.username || 'User' }))
 : [];
 setOrgUsers(mapped);
 } catch (e) {
 setOrgUsers([]);
 }

 // Calculate stats using fetched data
 const totalOrders = poData.length;
 const pendingOrders = poData.filter((po: any) => po.status === 'pending').length;
 const approvedOrders = poData.filter((po: any) => po.status === 'approved').length;
 const receivedOrders = poData.filter((po: any) => po.status === 'received').length;
 const totalSpent = poData.reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0);
 const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
 const totalVendors = vendorsData.length;
 const activeVendors = vendorsData.filter((v: any) => v.is_active).length;
 const dueAmountTotal = poData
 .filter((po: any) => po.payment_status === 'pending' || po.payment_status === 'partial')
 .reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0);

 setStats({
 totalOrders,
 pendingOrders,
 approvedOrders,
 receivedOrders,
 totalSpent,
 averageOrderValue,
 totalVendors,
 activeVendors,
 dueAmountTotal,
 });

 // Calculate and set vendor statistics
 const vendorStatsData = calculateVendorStats(vendorsData, poData);
 setVendorStats(vendorStatsData);
 } catch (error: any) {
 console.error('Failed to fetch data:', error);
 
 dispatch(addNotification({
 type: 'error',
 title: 'Data Loading Failed',
 message: 'Failed to load purchase data. Please refresh the page.',
 duration: 5000,
 }));
 }
 };

// Form handlers
const handleCreatePO = async (e: React.FormEvent) => {
 e.preventDefault();
 
 // Validation
 if (!newPO.vendor_id) {
 dispatch(addNotification({
 type: 'error',
 title: 'Validation Error',
 message: 'Please select a vendor',
 duration: 4000,
 }));
 return;
 }
 
 if (
 poItems.length === 0 ||
 poItems.every(row => !((row.item || row.description?.trim()) && (Number(row.quantity) > 0) && (Number(row.unit_price) > 0)))
 ) {
 dispatch(addNotification({
 type: 'error',
 title: 'Validation Error',
 message: 'Please add at least one valid item with name, quantity > 0, and unit price > 0',
 duration: 4000,
 }));
 return;
 }
 
 setIsCreatingPO(true);
 
 try {
 // Transform UI state to API schema
 const today = new Date();
 const orderDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
 const requester = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'System User' : 'System User';

 const poPayload: any = {
 vendor_id: newPO.vendor_id,
 project_id: newPO.project_id || undefined,
 customer_id: newPO.customer_id || undefined,
 order_date: orderDate,
 expected_delivery_date: newPO.expected_delivery_date || undefined,
 received_date: newPO.received_date || undefined,
 priority: 'medium',
 department: 'IT',
 requested_by: newPO.requested_by || requester,
 shipping_address: '',
 payment_method: 'net_30',
 notes: newPO.notes || undefined,
 items: poItems
 .filter((row) => (row.description?.trim() || row.item) && Number(row.quantity) > 0 && Number(row.unit_price) > 0)
 .map((row) => ({
 item_name: row.item?.display_name || row.item?.name || row.description,
 quantity: Math.max(1, Number(row.quantity) || 1),
 unit_price: Number(row.unit_price) || 0,
 unit: 'pcs',
 description: row.description || row.item?.description || ''
 })),
 };

 
 const response = await apiClient.post('/purchase-orders/', poPayload);
 
 
 // Show success message
 dispatch(addNotification({
 type: 'success',
 title: 'Purchase Order Created',
 message: `PO Number: ${response.data.po_number}`,
 duration: 5000,
 }));
 
 
 setShowCreatePO(false);
 setNewPO({
 vendor_id: '',
 project_id: '',
 customer_id: '',
 expected_delivery_date: '',
 received_date: '',
 requested_by: requester,
 notes: '',
 items: [{ name: '', quantity: 1, unit_price: 0 }]
 });
 setPoItems([{ item: null, description: '', quantity: 1, unit_price: 0, tax_rate: 0, discount_rate: 0 }]);
 fetchData();
 } catch (error: any) {
 console.error('❌ Failed to create purchase order:', error);
 console.error('Error details:', {
 status: error.response?.status,
 statusText: error.response?.statusText,
 data: error.response?.data,
 message: error.message
 });
 
 // Show user-friendly error message
 const errorMessage = error.response?.data?.detail || 
 error.response?.data?.message || 
 error.message || 
 'Failed to create purchase order';
 dispatch(addNotification({
 type: 'error',
 title: 'Purchase Order Creation Failed',
 message: errorMessage,
 duration: 6000,
 }));
 } finally {
 setIsCreatingPO(false);
 }
};

const handleCreateVendor = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 // Normalize payload to match backend enums (lowercase)
 const payload = {
 ...newVendor,
 payment_terms: (newVendor.payment_terms || '').toLowerCase(),
 } as any;
 const res = await apiClient.post('/vendors/', payload);
 const createdVendor = res.data;

 // Upload attachments (if any)
 const filesToUpload = vendorAttachments.map(a => a.file).filter(Boolean) as File[];
 if (createdVendor?.id && filesToUpload.length > 0) {
 try {
 await Promise.all(
 filesToUpload.map(async (file) => {
 const form = new FormData();
 form.append('file', file);
 await apiClient.post(`/vendors/${createdVendor.id}/attachments`, form);
 })
 );
 } catch (uploadErr: any) {
 dispatch(addNotification({
 type: 'error',
 title: 'Attachment Upload Issue',
 message: 'Some attachments could not be uploaded.',
 duration: 4000,
 }));
 }
 }
 
 dispatch(addNotification({
 type: 'success',
 title: 'Vendor Created',
 message: `Vendor"${newVendor.name}" has been successfully created.`,
 duration: 4000,
 }));
 
 setShowCreateVendor(false);
 setNewVendor({
 name: '',
 email: '',
 phone: '',
 address: '',
 city: '',
 state: '',
 country: '',
 postal_code: '',
 tax_id: '',
 payment_terms: 'net_30',
 credit_limit: 0,
 });
 setVendorAttachments([]);
 fetchData();
 } catch (error: any) {
 console.error('Failed to create vendor:', error);
 
 const errorMessage = error.response?.data?.detail || 
 error.response?.data?.message || 
 error.message || 
 'Failed to create vendor';
 dispatch(addNotification({
 type: 'error',
 title: 'Vendor Creation Failed',
 message: errorMessage,
 duration: 5000,
 }));
 }
};

// Delete handlers
const handleDeletePO = async (po: PurchaseOrder) => {
 try {
 const ok = window.confirm(`Are you sure you want to delete purchase order ${po.po_number || ''}?`);
 if (!ok) return;
 await apiClient.delete(`/purchase-orders/${po.id}`);
 // Update local state and derived stats
 setPurchaseOrders(prev => {
 const updated = prev.filter(p => p.id !== po.id);
 // Recompute stats and vendor stats based on updated POs
 const totalOrders = updated.length;
 const pendingOrders = updated.filter((x) => x.status === 'pending').length;
 const approvedOrders = updated.filter((x) => x.status === 'approved').length;
 const receivedOrders = updated.filter((x) => x.status === 'received').length;
 const totalSpent = updated.reduce((sum, x) => sum + (x.total_amount || 0), 0);
 const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
 const totalVendors = vendors.length;
 const activeVendors = vendors.filter((v) => v.is_active).length;
 const dueAmountTotal = updated
 .filter((x) => x.payment_status === 'pending' || x.payment_status === 'partial')
 .reduce((sum, x) => sum + (x.total_amount || 0), 0);
 setStats({
 totalOrders,
 pendingOrders,
 approvedOrders,
 receivedOrders,
 totalSpent,
 averageOrderValue,
 totalVendors,
 activeVendors,
 dueAmountTotal,
 });
 setVendorStats(calculateVendorStats(vendors, updated));
 return updated;
 });
 dispatch(addNotification({
 type: 'success',
 title: 'Deleted',
 message: 'Purchase order deleted successfully',
 duration: 3000,
 }));
 } catch (err: any) {
 console.error('Failed to delete purchase order:', err);
 const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to delete purchase order';
 dispatch(addNotification({
 type: 'error',
 title: 'Delete Failed',
 message: errorMessage,
 duration: 5000,
 }));
 }
};

const handleDeleteVendor = async (vendor: Vendor, e?: React.MouseEvent) => {
 try {
 if (e) e.stopPropagation();
 const relatedPOs = purchaseOrders.filter(p => p.vendor_id === vendor.id).length;
 const ok = window.confirm(
 relatedPOs > 0
 ? `Delete vendor "${vendor.name}" and ${relatedPOs} related purchase order(s)? This cannot be undone.`
 : `Delete vendor "${vendor.name}"? This cannot be undone.`
 );
 if (!ok) return;
 await apiClient.delete(`/vendors/${vendor.id}`);
 // Update local vendors and purchase orders to reflect cascade
 const newVendors = vendors.filter(v => v.id !== vendor.id);
 const newPOs = purchaseOrders.filter(p => p.vendor_id !== vendor.id);
 setVendors(newVendors);
 setPurchaseOrders(newPOs);
 // Recompute stats from updated data
 const totalOrders = newPOs.length;
 const pendingOrders = newPOs.filter((x) => x.status === 'pending').length;
 const approvedOrders = newPOs.filter((x) => x.status === 'approved').length;
 const receivedOrders = newPOs.filter((x) => x.status === 'received').length;
 const totalSpent = newPOs.reduce((sum, x) => sum + (x.total_amount || 0), 0);
 const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
 const dueAmountTotal = newPOs
 .filter((x) => x.payment_status === 'pending' || x.payment_status === 'partial')
 .reduce((sum, x) => sum + (x.total_amount || 0), 0);
 const totalVendors = newVendors.length;
 const activeVendors = newVendors.filter(v => v.is_active).length;
 setStats({
 totalOrders,
 pendingOrders,
 approvedOrders,
 receivedOrders,
 totalSpent,
 averageOrderValue,
 totalVendors,
 activeVendors,
 dueAmountTotal,
 });
 // Recompute vendor stats
 setVendorStats(calculateVendorStats(newVendors, newPOs));
 dispatch(addNotification({
 type: 'success',
 title: 'Deleted',
 message: 'Vendor deleted successfully',
 duration: 3000,
 }));
 } catch (err: any) {
 console.error('Failed to delete vendor:', err);
 const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to delete vendor';
 dispatch(addNotification({
 type: 'error',
 title: 'Delete Failed',
 message: errorMessage,
 duration: 5000,
 }));
 }
};

 // Helper functions for PO items
 const addPOItem = () => {
 setNewPO(prev => ({
 ...prev,
 items: [...prev.items, { name: '', quantity: 1, unit_price: 0 }]
 }));
 };

 const removePOItem = (index: number) => {
 setNewPO(prev => ({
 ...prev,
 items: prev.items.filter((_, i) => i !== index)
 }));
 };

 const updatePOItem = (index: number, field: string, value: any) => {
 setNewPO(prev => ({
 ...prev,
 items: prev.items.map((item, i) => 
 i === index ? { ...item, [field]: value } : item
 )
 }));
 };

 const tabs = [
 { id: 'purchase-orders', label: 'Purchase Orders' },
 { id: 'vendors', label: 'Vendors' },
 ];

 // Default requested_by to current user on load
 useEffect(() => {
 if (user) {
 const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'System User';
 setNewPO(prev => ({ ...prev, requested_by: prev.requested_by || name }));
 }
 }, [user]);

 // Close inline edit popups when clicking outside
 useEffect(() => {
 const onDocClick = (e: MouseEvent) => {
 const target = e.target as Node;
 if (editingPOId && inlinePopoverRef.current && !inlinePopoverRef.current.contains(target)) {
 cancelInlineEdit();
 }
 if (editingVendorId && vendorInlinePopoverRef.current && !vendorInlinePopoverRef.current.contains(target)) {
 cancelVendorInlineEdit();
 }
 };
 document.addEventListener('mousedown', onDocClick);
 return () => document.removeEventListener('mousedown', onDocClick);
 }, [editingPOId, editingVendorId]);

 return (
 <div>
 
 {/* Page Header */}
 <div className="mb-8">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="page-title font-bold text-gray-900">Purchase Management</h1>
 <p className="mt-2 text-gray-600">
 Manage vendors, purchase orders, and procurement processes
 </p>
 </div>
 <div className="flex space-x-3">
 <button
 onClick={() => setShowCreatePO(true)}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <PlusIcon className="h-4 w-4" />
 <span>Create Purchase Order</span>
 </button>
 <button
 onClick={() => setShowCreateVendor(true)}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <BuildingOffice2Icon className="h-4 w-4" />
 <span>Add Vendor</span>
 </button>
 <button
 onClick={() => setActiveTab('purchase-orders')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <DocumentTextIcon className="h-4 w-4" />
 <span>View Purchases</span>
 </button>
 <button
 onClick={() => setActiveTab('vendors')}
 className="flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
 >
 <BuildingOffice2Icon className="h-4 w-4" />
 <span>View Vendors</span>
 </button>
 </div>
 </div>
 </div>


 {/* Create Purchase Order Form */}
{showCreatePO && (
 <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
 <div className="flex items-center mb-6">
 <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
 <DocumentTextIcon className="h-5 w-5 text-blue-600" />
 </div>
 <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
 <button
 onClick={() => setShowCreatePO(false)}
 className="ml-auto text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 
 
 <form onSubmit={handleCreatePO} className="space-y-6">
 {/* Top Row: Vendor, Expected, Delivery */}
 <div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
 <select
 value={newPO.vendor_id}
 onChange={(e) => setNewPO(prev => ({ ...prev, vendor_id: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 required
 >
 <option value="">Select Vendor</option>
 {vendors.map(vendor => (
 <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
 <input
 type="date"
 value={newPO.expected_delivery_date}
 onChange={(e) => setNewPO(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
 <input
 type="date"
 value={newPO.received_date}
 onChange={(e) => setNewPO(prev => ({ ...prev, received_date: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
 <select
 value={newPO.project_id}
 onChange={(e) => setNewPO(prev => ({ ...prev, project_id: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select Project (optional)</option>
 {projects.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 </div>
 </div>
 </div>
 {/* Second Row: Project, Customer, Ordered By */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
 <select
 value={newPO.customer_id}
 onChange={(e) => setNewPO(prev => ({ ...prev, customer_id: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Select Customer (optional)</option>
 {customers.map(c => {
 const name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed';
 return <option key={c.id} value={c.id}>{name}</option>;
 })}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Ordered By</label>
 <select
 value={newPO.requested_by}
 onChange={(e) => setNewPO(prev => ({ ...prev, requested_by: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 >
 {(() => {
 const currentName = (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'System User' : 'System User');
 const options = orgUsers.length ? orgUsers : [];
 const ensureCurrent = options.some(u => u.full_name === currentName) ? options : [{ id: user?.id || 'me', full_name: currentName }, ...options];
 return ensureCurrent.map(u => (
 <option key={u.id} value={u.full_name}>{u.full_name}</option>
 ));
 })()}
 </select>
 </div>
 <div className="lg:col-span-2">
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
 <textarea
 value={newPO.notes}
 onChange={(e) => setNewPO(prev => ({ ...prev, notes: e.target.value }))}
 rows={3}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
 placeholder="Any additional notes or requirements"
 />
 </div>
 </div>


 {/* Items Table (copied style and function from Invoice creation) */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">Items *</label>
 <InvoiceItemsTable selectedItems={poItems} onItemsChange={setPoItems} />
 </div>

 {/* Form Actions */}
 <div className="flex justify-end space-x-3 pt-6 border-t">
 <button
 type="button"
 onClick={() => setShowCreatePO(false)}
 className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={isCreatingPO}
className={`btn-page-action btn-no-minh ${isCreatingPO ? 'opacity-50 cursor-not-allowed' : ''}`}
 >
 {isCreatingPO ? (
 <>
 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
 Creating...
 </>
 ) : (
 'Create Purchase Order'
 )}
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Create Vendor Form */}
{showCreateVendor && (
 <div className="bg-white shadow rounded-lg p-6 mb-6 border border-gray-200">
 <div className="flex items-center mb-6">
 <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
 <BuildingOffice2Icon className="h-5 w-5 text-green-600" />
 </div>
 <h2 className="text-lg font-semibold text-gray-900">Add New Vendor</h2>
 <button
 onClick={() => setShowCreateVendor(false)}
 className="ml-auto text-gray-400 hover:text-gray-600"
 >
 ×
 </button>
 </div>
 
 <form onSubmit={handleCreateVendor} className="space-y-6">
 {/* Row 1: Vendor Name, Email, Phone, Tax ID */}
 <div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
 <input
 type="text"
 value={newVendor.name}
 onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
 <input
 type="email"
 value={newVendor.email}
 onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
 <input
 type="tel"
 value={newVendor.phone}
 onChange={(e) => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
 <input
 type="text"
 value={newVendor.tax_id}
 onChange={(e) => setNewVendor(prev => ({ ...prev, tax_id: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 </div>
 </div>

 {/* Row 2: Payment Terms, Credit Limit, Address, City */}
 <div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
 <select
 value={newVendor.payment_terms}
 onChange={(e) => setNewVendor(prev => ({ ...prev, payment_terms: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 >
 <option value="">Select Payment Terms</option>
 <option value="net_15">Net 15</option>
 <option value="net_30">Net 30</option>
 <option value="net_60">Net 60</option>
 <option value="net_90">Net 90</option>
 <option value="cod">Cash on Delivery</option>
 <option value="prepaid">Prepaid</option>
 <option value="due_on_receipt">Due on Receipt</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
 <input
 type="number"
 min="0"
 step="0.01"
 value={newVendor.credit_limit}
 onChange={(e) => setNewVendor(prev => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
 <input
 type="text"
 value={newVendor.address}
 onChange={(e) => setNewVendor(prev => ({ ...prev, address: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
 <input
 type="text"
 value={newVendor.city}
 onChange={(e) => setNewVendor(prev => ({ ...prev, city: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 </div>
 </div>

 {/* Row 3: State/Province, Country, Postal Code, Attachments */}
 <div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
 <input
 type="text"
 value={newVendor.state}
 onChange={(e) => setNewVendor(prev => ({ ...prev, state: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
 <input
 type="text"
 value={newVendor.country}
 onChange={(e) => setNewVendor(prev => ({ ...prev, country: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
 <input
 type="text"
 value={newVendor.postal_code}
 onChange={(e) => setNewVendor(prev => ({ ...prev, postal_code: e.target.value }))}
 className="w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
 />
 </div>
 <div>
 <div className="flex items-center justify-between">
 <label className="block text-sm font-medium text-gray-700">Attachments</label>
 <button
 type="button"
 onClick={() => setVendorAttachments(prev => [...prev, { id: Date.now() }])}
 className="inline-flex items-center px-2 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
 >
 <PlusIcon className="w-4 h-4 mr-1" /> Add
 </button>
 </div>
 {vendorAttachments.length === 0 && (
 <div className="text-xs text-gray-500 mt-2">No attachments added.</div>
 )}
 <div className="mt-2 space-y-2">
 {vendorAttachments.map(att => (
 <div key={att.id} className="flex items-center gap-3">
 <div className="flex-1">
 <input
 type="file"
 onChange={(e) => {
 const file = e.currentTarget.files?.[0];
 setVendorAttachments(prev => prev.map(a => a.id === att.id ? { ...a, file } : a));
 }}
 className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
 />
 </div>
 <button
 type="button"
 onClick={() => setVendorAttachments(prev => prev.filter(a => a.id !== att.id))}
 className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded"
 title="Remove attachment"
 >
 <TrashIcon className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 
 {/* Form Actions */}
 <div className="flex justify-end space-x-3 pt-6 border-t">
 <button
 type="button"
 onClick={() => setShowCreateVendor(false)}
 className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 type="submit"
className="btn-page-action btn-no-minh"
 >
 Add Vendor
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Metrics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
<div className="metric-card metric-blue bg-white px-4 py-3 rounded-lg shadow border-t-4 border-blue-600">
 <div className="flex items-center">
 <div className="p-2 bg-blue-100 rounded-lg">
 <DocumentTextIcon className="h-6 w-6 text-blue-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Total Orders</p>
 <p className="metric-value text-2xl font-bold">{stats.totalOrders}</p>
 </div>
 </div>
 </div>

<div className="metric-card metric-yellow bg-white px-4 py-3 rounded-lg shadow border-t-4 border-yellow-600">
 <div className="flex items-center">
 <div className="p-2 bg-yellow-100 rounded-lg">
 <ClockIcon className="h-6 w-6 text-yellow-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Pending Orders</p>
 <p className="metric-value text-2xl font-bold">{stats.pendingOrders}</p>
 </div>
 </div>
 </div>

<div className="metric-card metric-green bg-white px-4 py-3 rounded-lg shadow border-t-4 border-green-600">
 <div className="flex items-center">
 <div className="p-2 bg-green-100 rounded-lg">
 <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Total Spent</p>
 <p className="metric-value text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
 </div>
 </div>
 </div>

<div className="metric-card metric-purple bg-white px-4 py-3 rounded-lg shadow border-t-4 border-purple-600">
 <div className="flex items-center">
 <div className="p-2 bg-purple-100 rounded-lg">
 <BuildingOffice2Icon className="h-6 w-6 text-purple-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Active Vendors</p>
 <p className="metric-value text-2xl font-bold">{stats.activeVendors}</p>
 </div>
 </div>
 </div>

<div className="metric-card metric-red bg-white px-4 py-3 rounded-lg shadow border-t-4 border-red-600">
 <div className="flex items-center">
 <div className="p-2 bg-red-100 rounded-lg">
 <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
 </div>
 <div className="ml-4">
 <p className="text-sm font-medium text-gray-600">Due Amount</p>
 <p className="metric-value text-2xl font-bold">${stats.dueAmountTotal.toFixed(2)}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Content */}
 <div className="bg-white rounded-lg shadow overflow-hidden">
 {activeTab === 'purchase-orders' && (
 <>
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-900">Purchase Orders ({filteredPurchaseOrders.length})</h3>
 <div className="flex items-center gap-2">
 <div className="relative">
 <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 placeholder="Search orders..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-40 pl-7 pr-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 <button
 type="button"
 title="Refresh"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={() => {
 setSearchTerm('');
 setFilterPOStatus([]);
 setFilterDeliveryStatus([]);
 setFilterPaymentStatus([]);
 setFilterPOVendorIds([]);
 setPoFilterFromDate('');
 setPoFilterToDate('');
 setPendingPoFrom('');
 setPendingPoTo('');
 setPoDateOpen(false);
 setPoHeaderFilterOpen(null);
 setPoSortField(null);
 setPoSortDir('asc');
 fetchData();
 }}
 >
 <ArrowPathIcon className="w-4 h-4" />
 </button>
 <button
 type="button"
 title="Filter by date range"
 className="p-1 text-gray-500 hover:text-gray-700"
 ref={poDateRef}
 onClick={(e) => {
 e.stopPropagation();
 const rect = e.currentTarget.getBoundingClientRect();
 setPoFilterButtonRect(rect);
 setPendingPoFrom(poFilterFromDate || '');
 setPendingPoTo(poFilterToDate || '');
 setPoDateOpen((o) => !o);
 }}
 >
 <CalendarIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 <div className="overflow-x-auto projects-table" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 PO Number
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Vendor</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = poHeaderFilterOpen !== 'vendor';
 if (isOpening) {
 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
 setPoFilterButtonRect(rect);
 }
 setPoHeaderFilterOpen(isOpening ? 'vendor' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('status')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Status</span>
 {poSortField === 'status' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = poHeaderFilterOpen !== 'status';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setPoFilterButtonRect(rect);
 }
 setPoHeaderFilterOpen(isOpening ? 'status' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('delivery_status')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Delivery Status</span>
 {poSortField === 'delivery_status' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = poHeaderFilterOpen !== 'delivery_status';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setPoFilterButtonRect(rect);
 }
 setPoHeaderFilterOpen(isOpening ? 'delivery_status' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('payment_status')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Payment Status</span>
 {poSortField === 'payment_status' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = poHeaderFilterOpen !== 'payment_status';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setPoFilterButtonRect(rect);
 }
 setPoHeaderFilterOpen(isOpening ? 'payment_status' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Total
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('order_date')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Order Date</span>
 {poSortField === 'order_date' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('expected_delivery_date')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Expected</span>
 {poSortField === 'expected_delivery_date' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th onDoubleClick={() => onPOHeaderDblClick('received_date')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Delivery</span>
 {poSortField === 'received_date' && (
 poSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredPurchaseOrders.map((po: PurchaseOrder) => (
 <tr key={po.id} className="hover:bg-gray-50">
 <td className="py-2 whitespace-nowrap text-sm font-semibold text-black">
 {po.po_number}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 {vendors.find(v => v.id === po.vendor_id)?.name || 'Unknown Vendor'}
 </td>
 <td className="py-2 whitespace-nowrap">
 <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${
 po.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
 po.status === 'approved' ? 'bg-green-100 text-green-700' :
 po.status === 'received' ? 'bg-blue-100 text-blue-700' :
 'bg-gray-100 text-gray-700'
 }`}>
 {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
 </span>
 </td>
 <td className="py-2 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, po, 'delivery_status'); }}>
 <div className="relative inline-block">
 <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm hover:ring-1 hover:ring-gray-300 transition-all ${
 (po.delivery_status || 'pending') === 'pending' ? 'bg-gray-100 text-gray-700' :
 (po.delivery_status || 'pending') === 'in_transit' ? 'bg-blue-100 text-blue-700' :
 (po.delivery_status || 'pending') === 'delivered' ? 'bg-green-100 text-green-700' :
 'bg-red-100 text-red-700'
 }`}>
 {(po.delivery_status || 'pending').replace('_', ' ').charAt(0).toUpperCase() + (po.delivery_status || 'pending').replace('_', ' ').slice(1)}
 </span>
 {editingPOId === po.id && editingField === 'delivery_status' && (
 <InlineEditPortal rect={inlineEditRect}>
 <div ref={inlinePopoverRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 {['pending', 'in_transit', 'delivered', 'cancelled'].map((opt) => (
 <li
 key={opt}
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt === (po.delivery_status || 'pending') ? 'bg-gray-50' : ''}`}
 onClick={() => { saveInlineEdit(po.id, opt); }}
 >
 <span className="capitalize">{opt.replace('_', ' ')}</span>
 {opt === (po.delivery_status || 'pending') && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 ))}
 </ul>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="py-2 whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={(e) => { e.stopPropagation(); startInlineEdit(e, po, 'payment_status'); }}>
 <div className="relative inline-block">
 <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm hover:ring-1 hover:ring-gray-300 transition-all ${
 (po.payment_status || 'pending') === 'pending' ? 'bg-gray-100 text-gray-700' :
 (po.payment_status || 'pending') === 'paid' ? 'bg-green-100 text-green-700' :
 (po.payment_status || 'pending') === 'partial' ? 'bg-yellow-100 text-yellow-700' :
 'bg-red-100 text-red-700'
 }`}>
 {(po.payment_status || 'pending').charAt(0).toUpperCase() + (po.payment_status || 'pending').slice(1)}
 </span>
 {editingPOId === po.id && editingField === 'payment_status' && (
 <InlineEditPortal rect={inlineEditRect}>
 <div ref={inlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 {['pending', 'paid', 'partial', 'overdue'].map((opt) => (
 <li
 key={opt}
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${opt === (po.payment_status || 'pending') ? 'bg-gray-50' : ''}`}
 onClick={() => { saveInlineEdit(po.id, opt); }}
 >
 <span className="capitalize">{opt}</span>
 {opt === (po.payment_status || 'pending') && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 ))}
 </ul>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 ${po.total_amount.toFixed(2)}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-700">
 {new Date(po.order_date).toLocaleDateString()}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-700">
 {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '—'}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-700">
 {po.received_date ? new Date(po.received_date).toLocaleDateString() : '—'}
 </td>
 <td className="py-2 whitespace-nowrap text-sm font-medium">
 <div className="flex items-center space-x-2">
 <button
onClick={() => navigate(getTenantRoute(`/purchase/orders/${po.id}`, user?.role, user?.organization))}
className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
onClick={() => navigate(getTenantRoute(`/purchase/orders/${po.id}?tab=edit`, user?.role, user?.organization))}
className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={async () => {
 try {
 const response = await apiClient.get(`/purchase-orders/${po.id}/pdf`, { responseType: 'blob' });
 const url = window.URL.createObjectURL(new Blob([response.data]));
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `purchase_order_${po.po_number || po.id}.pdf`);
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.URL.revokeObjectURL(url);
 } catch (e) {
 console.error('Failed to download purchase order PDF:', e);
 }
 }}
className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
 title="Download PDF"
 >
 <DocumentArrowDownIcon className="h-4 w-4" />
 </button>
 <button
 onClick={() => handleDeletePO(po)}
className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 
 {/* Status Filter Popup */}
 {poHeaderFilterOpen === 'status' && (
 <FilterPortal buttonRect={poFilterButtonRect}>
 <div ref={poHeaderFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 {['pending', 'approved', 'received', 'cancelled'].map((status) => {
 const isSelected = filterPOStatus.includes(status);
 return (
 <li
 key={status}
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
 onClick={() => {
 setFilterPOStatus(prev => 
 prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
 );
 }}
 >
 <span className="capitalize">{status}</span>
 {isSelected && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-0.5 border-t border-gray-100 mt-1">
 <button 
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={() => { setFilterPOStatus([]); setPoHeaderFilterOpen(null); }}
 >
 Clear
 </button>
 <button 
 className="filter-popup-btn filter-popup-btn-filter"
 onClick={() => setPoHeaderFilterOpen(null)}
 >
 Apply
 </button>
 </div>
 </div>
 </FilterPortal>
 )}
 
 {/* Delivery Status Filter Popup */}
 {poHeaderFilterOpen === 'delivery_status' && (
 <FilterPortal buttonRect={poFilterButtonRect}>
 <div ref={poHeaderFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 {['pending', 'in_transit', 'delivered', 'cancelled'].map((status) => {
 const isSelected = filterDeliveryStatus.includes(status);
 return (
 <li
 key={status}
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
 onClick={() => {
 setFilterDeliveryStatus(prev => 
 prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
 );
 }}
 >
 <span className="capitalize">{status.replace('_', ' ')}</span>
 {isSelected && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-0.5 border-t border-gray-100 mt-1">
 <button 
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={() => { setFilterDeliveryStatus([]); setPoHeaderFilterOpen(null); }}
 >
 Clear
 </button>
 <button 
 className="filter-popup-btn filter-popup-btn-filter"
 onClick={() => setPoHeaderFilterOpen(null)}
 >
 Apply
 </button>
 </div>
 </div>
 </FilterPortal>
 )}
 
 {/* Payment Status Filter Popup */}
 {poHeaderFilterOpen === 'payment_status' && (
 <FilterPortal buttonRect={poFilterButtonRect}>
 <div ref={poHeaderFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 {['pending', 'paid', 'partial', 'overdue'].map((status) => {
 const isSelected = filterPaymentStatus.includes(status);
 return (
 <li
 key={status}
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-gray-50' : ''}`}
 onClick={() => {
 setFilterPaymentStatus(prev => 
 prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
 );
 }}
 >
 <span className="capitalize">{status}</span>
 {isSelected && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-0.5 border-t border-gray-100 mt-1">
 <button 
 className="filter-popup-btn filter-popup-btn-clear"
 onClick={() => { setFilterPaymentStatus([]); setPoHeaderFilterOpen(null); }}
 >
 Clear
 </button>
 <button 
 className="filter-popup-btn filter-popup-btn-filter"
 onClick={() => setPoHeaderFilterOpen(null)}
 >
 Apply
 </button>
 </div>
 </div>
 </FilterPortal>
 )}
 
 {/* Vendor Filter Popup */}
 {poHeaderFilterOpen === 'vendor' && (
 <FilterPortal buttonRect={poFilterButtonRect}>
 <div ref={poHeaderFilterRef} className="w-56 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter vendor</div>
 <div className="px-1.5">
 <input
 type="text"
 placeholder="Search vendors..."
 className="w-full px-2 border border-gray-300 rounded text-xs"
 onChange={(e) => {
 // no-op search filter for now; keep simple (optional enhance later)
 }}
 />
 </div>
 <ul className="max-h-56 overflow-auto">
 {vendors.map((v) => {
 const checked = filterPOVendorIds.includes(v.id);
 return (
 <li key={v.id}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-3.5 w-3.5"
 checked={checked}
 onChange={(e) => {
 e.stopPropagation();
 setFilterPOVendorIds(prev => checked ? prev.filter(id => id !== v.id) : [...prev, v.id]);
 }}
 />
 <span className="truncate" title={v.name}>{v.name}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterPOVendorIds([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setPoHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}

 {/* Date Filter Popup */}
 {poDateOpen && (
 <FilterPortal buttonRect={poFilterButtonRect} alignRight={true}>
 <div className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
 <div className="px-1 pb-1">
 <DateRangeCalendar size="sm"
 initialFrom={pendingPoFrom || null}
 initialTo={pendingPoTo || null}
 onChange={(from, to) => {
 if (from && !to) {
 setPendingPoFrom(from);
 setPendingPoFrom(from);
 } else {
 setPendingPoFrom(from || '');
 setPendingPoTo(to || '');
 }
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { 
 e.stopPropagation(); 
 setPoFilterFromDate(''); 
 setPoFilterToDate(''); 
 setPoDateOpen(false); 
 }}>
 Clear
 </button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 const from = pendingPoFrom || '';
 const to = pendingPoTo || pendingPoFrom || '';
 setPoFilterFromDate(from);
 setPoFilterToDate(to);
 setPoDateOpen(false);
 }}>
 Filter
 </button>
 </div>
 </div>
 </FilterPortal>
 )}
 </div>
 </>
 )}

 {activeTab === 'vendors' && (
 <>
 <div className="px-6 py-4 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-medium text-gray-900">Vendors ({filteredVendors.length})</h3>
 <div className="flex items-center gap-2">
 <div className="relative">
 <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 placeholder="Search vendors..."
 value={vendorSearchTerm}
 onChange={(e) => setVendorSearchTerm(e.target.value)}
 className="w-40 pl-7 pr-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-300"
 />
 </div>
 <button
 type="button"
 title="Refresh"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={() => {
 setVendorSearchTerm('');
 setVendorSortField(null);
 setVendorSortDir('asc');
 setVendorFilterFromDate('');
 setVendorFilterToDate('');
 setPendingVendorFrom('');
 setPendingVendorTo('');
 setVendorDateOpen(false);
 setFilterVendorStatus([]);
 setFilterVendorCountries([]);
 setVendorHeaderFilterOpen(null);
 fetchData();
 }}
 >
 <ArrowPathIcon className="w-4 h-4" />
 </button>
 <div className="relative" ref={vendorDateRef}>
 <button
 type="button"
 title="Filter by date range"
 className="p-1 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const rect = e.currentTarget.getBoundingClientRect();
 setVendorFilterButtonRect(rect);
 setPendingVendorFrom(vendorFilterFromDate || '');
 setPendingVendorTo(vendorFilterToDate || '');
 setVendorDateOpen((o) => !o);
 }}
 >
 <CalendarIcon className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
 
 {/* Vendor Date Filter Portal - render outside the table context */}
 {vendorDateOpen && (
 <FilterPortal buttonRect={vendorFilterButtonRect} alignRight={true}>
 <div className="w-64 border border-gray-200 bg-white shadow-sm p-1.5 text-xs" style={{borderRadius: '5px'}}>
 <div className="px-1 pb-1">
 <DateRangeCalendar size="sm"
 initialFrom={pendingVendorFrom || null}
 initialTo={pendingVendorTo || null}
 onChange={(from, to) => {
 if (from && !to) {
 setPendingVendorFrom(from);
 setPendingVendorFrom(from);
 } else {
 setPendingVendorFrom(from || '');
 setPendingVendorTo(to || '');
 }
 }}
 />
 </div>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { 
 e.stopPropagation(); 
 setVendorFilterFromDate(''); 
 setVendorFilterToDate(''); 
 setVendorDateOpen(false); 
 }}>
 Clear
 </button>
 <button className="filter-popup-btn filter-popup-btn-filter" onClick={(e) => {
 e.stopPropagation();
 const from = pendingVendorFrom || '';
 const to = pendingVendorTo || pendingVendorFrom || '';
 setVendorFilterFromDate(from);
 setVendorFilterToDate(to);
 setVendorDateOpen(false);
 }}>
 Filter
 </button>
 </div>
 </div>
 </FilterPortal>
 )}
 
 <div className="overflow-x-auto projects-table" style={{backgroundColor: 'rgb(249, 250, 251)'}}>
 <table className="min-w-full divide-y divide-gray-200">
 <thead className="bg-gray-50">
 <tr>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Name
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Email
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Phone
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 <div className="inline-flex items-center gap-1">
 <span>Country</span>
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = vendorHeaderFilterOpen !== 'country';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setVendorFilterButtonRect(rect);
 }
 setVendorHeaderFilterOpen(isOpening ? 'country' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th onDoubleClick={() => onVendorHeaderDblClick('purchases')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Purchases</span>
 {vendorSortField === 'purchases' && (
 vendorSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th onDoubleClick={() => onVendorHeaderDblClick('due_amount')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Due Amount</span>
 {vendorSortField === 'due_amount' && (
 vendorSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th onDoubleClick={() => onVendorHeaderDblClick('invoices')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Invoices</span>
 {vendorSortField === 'invoices' && (
 vendorSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 </div>
 </th>
 <th onDoubleClick={() => onVendorHeaderDblClick('status')} className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider cursor-pointer select-none">
 <div className="inline-flex items-center gap-1">
 <span>Status</span>
 {vendorSortField === 'status' && (
 vendorSortDir === 'asc' ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />
 )}
 <span className="relative">
 <button
 type="button"
 className="p-0.5 text-gray-500 hover:text-gray-700"
 onClick={(e) => {
 e.stopPropagation();
 const isOpening = vendorHeaderFilterOpen !== 'status';
 if (isOpening) {
 const rect = e.currentTarget.getBoundingClientRect();
 setVendorFilterButtonRect(rect);
 }
 setVendorHeaderFilterOpen(isOpening ? 'status' : null);
 }}
 >
 <FunnelIcon className="w-3.5 h-3.5" />
 </button>
 </span>
 </div>
 </th>
 <th className="py-2 text-left text-sm font-semibold text-black uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {displayedVendors.map((vendor: Vendor) => {
 const stats = vendorStats[vendor.id] || { purchases: 0, dueAmount: 0, invoices: 0 };
 return (
 <tr key={vendor.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(getTenantRoute(`/purchase/vendors/${vendor.id}`, user?.role, user?.organization))}>
 <td className="py-2 whitespace-nowrap text-sm font-semibold text-black">
 {vendor.name}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 {vendor.email}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 {vendor.phone}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 {vendor.country || '—'}
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 <span className="inline-flex items-center px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
 {stats.purchases}
 </span>
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 <span className={`font-medium ${
 stats.dueAmount > 0 ? 'text-red-600' : 'text-gray-900'
 }`}>
 ${stats.dueAmount.toFixed(2)}
 </span>
 </td>
 <td className="py-2 whitespace-nowrap text-sm text-gray-900">
 <span className="inline-flex items-center px-2 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
 {stats.invoices}
 </span>
 </td>
 <td className="py-2 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); startVendorInlineEdit(e, vendor, 'status'); }}>
 <div className="relative inline-block">
 <span className={`inline-flex px-1.5 pt-0 pb-0.5 text-xs font-light rounded-sm ${
 vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
 }`}>
 {vendor.is_active ? 'Active' : 'Inactive'}
 </span>
 {editingVendorId === vendor.id && editingVendorField === 'status' && (
 <InlineEditPortal rect={vendorInlineEditRect}>
 <div ref={vendorInlinePopoverRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{ borderRadius: '5px' }}>
 <ul className="max-h-64 overflow-auto">
 <li
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${vendor.is_active ? 'bg-gray-50' : ''}`}
 onClick={() => { saveVendorInlineEdit(vendor.id, true); }}
 >
 <span className="capitalize">Active</span>
 {vendor.is_active && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 <li
 className={`px-2 rounded-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${!vendor.is_active ? 'bg-gray-50' : ''}`}
 onClick={() => { saveVendorInlineEdit(vendor.id, false); }}
 >
 <span className="capitalize">Inactive</span>
 {!vendor.is_active && <CheckIcon className="w-4 h-4 text-user-blue" />}
 </li>
 </ul>
 </div>
 </InlineEditPortal>
 )}
 </div>
 </td>
 <td className="py-2 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center space-x-2">
 <button
onClick={(e) => { e.stopPropagation(); navigate(getTenantRoute(`/purchase/vendors/${vendor.id}`, user?.role, user?.organization)); }}
className="inline-flex items-center justify-center p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
 title="View Details"
 >
 <EyeIcon className="h-4 w-4" />
 </button>
 <button
onClick={(e) => { e.stopPropagation(); navigate(getTenantRoute(`/purchase/vendors/${vendor.id}?tab=edit`, user?.role, user?.organization)); }}
className="inline-flex items-center justify-center p-2 rounded-md bg-gray-100 text-black hover:bg-gray-200 transition-colors"
 title="Edit"
 >
 <PencilIcon className="h-4 w-4" />
 </button>
 <button
 onClick={(e) => handleDeleteVendor(vendor, e)}
className="inline-flex items-center justify-center p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
 title="Delete"
 >
 <TrashIcon className="h-4 w-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 
 {/* Vendor Filter Popups */}
 {vendorHeaderFilterOpen === 'status' && (
 <FilterPortal buttonRect={vendorFilterButtonRect}>
 <div ref={vendorHeaderFilterRef} className="w-40 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter status</div>
 <ul className="max-h-48 overflow-auto">
 <li>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-3.5 w-3.5"
 checked={filterVendorStatus.includes(true)}
 onChange={(e) => {
 e.stopPropagation();
 setFilterVendorStatus(prev => prev.includes(true) ? prev.filter(x => x !== true) : [...prev, true]);
 }}
 />
 <span>Active</span>
 </label>
 </li>
 <li>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-3.5 w-3.5"
 checked={filterVendorStatus.includes(false)}
 onChange={(e) => {
 e.stopPropagation();
 setFilterVendorStatus(prev => prev.includes(false) ? prev.filter(x => x !== false) : [...prev, false]);
 }}
 />
 <span>Inactive</span>
 </label>
 </li>
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterVendorStatus([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setVendorHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 {vendorHeaderFilterOpen === 'country' && (
 <FilterPortal buttonRect={vendorFilterButtonRect}>
 <div ref={vendorHeaderFilterRef} className="w-44 border border-gray-200 bg-white shadow-sm p-1.5 text-xs font-medium" style={{borderRadius: '5px'}}>
 <div className="px-1.5 text-xs text-gray-800 font-medium">Filter country</div>
 <ul className="max-h-48 overflow-auto">
 {Array.from(new Set(vendors.map(v => v.country).filter(Boolean))).sort().map((country) => {
 const checked = filterVendorCountries.includes(country);
 return (
 <li key={country}>
 <label className="flex items-center gap-2 px-1.5 py-0.5 rounded-sm hover:bg-gray-50 cursor-pointer text-xs font-normal">
 <input
 type="checkbox"
 className="h-3.5 w-3.5"
 checked={checked}
 onChange={(e) => {
 e.stopPropagation();
 setFilterVendorCountries(prev => checked ? prev.filter(c => c !== country) : [...prev, country]);
 }}
 />
 <span>{country}</span>
 </label>
 </li>
 );
 })}
 </ul>
 <div className="flex justify-end gap-2 px-1.5 border-t border-gray-100 mt-1">
 <button className="filter-popup-btn filter-popup-btn-clear" onClick={(e) => { e.stopPropagation(); setFilterVendorCountries([]); }}>Clear</button>
 <button className="filter-popup-btn filter-popup-btn-close" onClick={(e) => { e.stopPropagation(); setVendorHeaderFilterOpen(null); }}>Close</button>
 </div>
 </div>
 </FilterPortal>
 )}
 </div>
 </>
 )}
 </div>
 </div>
 );
};

export default PurchasePage;

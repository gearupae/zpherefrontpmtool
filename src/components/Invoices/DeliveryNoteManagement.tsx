import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  TruckIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DeliveryNoteItem {
  item_id: string;
  item_name: string;
  quantity_ordered: number;
  quantity_delivered: number;
  quantity_remaining: number;
  unit_price: number;
  description?: string;
  is_fully_delivered: boolean;
  delivery_percentage: number;
  total_delivered_so_far?: number;
}

interface DeliveryNote {
  id: string;
  delivery_note_number: string;
  invoice_id: string;
  invoice_number: string;
  delivery_date: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  status: 'DRAFT' | 'PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  driver_name: string;
  vehicle_info: string;
  tracking_number?: string;
  notes: string;
  items: DeliveryNoteItem[];
  total_items: number;
  delivered_items: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryNoteFormData {
  delivery_date: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  driver_name: string;
  vehicle_info: string;
  tracking_number: string;
  notes: string;
  items: DeliveryNoteItem[];
}

interface DeliveryNoteManagementProps {
  invoiceId: string;
  invoiceNumber: string;
  invoiceItems: any[];
  onClose: () => void;
}

const DeliveryNoteManagement: React.FC<DeliveryNoteManagementProps> = ({
  invoiceId,
  invoiceNumber,
  invoiceItems,
  onClose
}) => {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [editingNote, setEditingNote] = useState<DeliveryNote | null>(null);

  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_address: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    driver_name: '',
    vehicle_info: '',
    tracking_number: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchDeliveryNotes();
  }, [invoiceId]);

  const calculateRemainingQuantities = (invoiceItems: any[], deliveryNotes: DeliveryNote[]) => {
    return invoiceItems.map(invoiceItem => {
      const itemName = invoiceItem.item?.name || invoiceItem.name || invoiceItem.description;
      const totalOrdered = invoiceItem.quantity;
      
      // Calculate total delivered across all existing delivery notes
      let totalDelivered = 0;
      deliveryNotes.forEach(note => {
        note.items.forEach(noteItem => {
          if (noteItem.item_name === itemName) {
            totalDelivered += noteItem.quantity_delivered;
          }
        });
      });
      
      const remaining = Math.max(0, totalOrdered - totalDelivered);
      
      return {
        item_id: invoiceItem.item_id || invoiceItem.id,
        item_name: itemName,
        quantity_ordered: totalOrdered,
        quantity_delivered: 0, // For new delivery note
        quantity_remaining: remaining,
        unit_price: invoiceItem.unit_price,
        description: invoiceItem.description,
        is_fully_delivered: remaining === 0,
        delivery_percentage: totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0,
        total_delivered_so_far: totalDelivered
      };
    });
  };

  useEffect(() => {
    if (showForm && !editingNote && deliveryNotes.length >= 0) {
      // Initialize items from invoice when creating new delivery note
      // Calculate remaining quantities based on previous deliveries
      const initialItems = calculateRemainingQuantities(invoiceItems, deliveryNotes);
      setFormData(prev => ({ ...prev, items: initialItems }));
    }
  }, [showForm, editingNote, invoiceItems, deliveryNotes]);

  const fetchDeliveryNotes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/delivery-notes/?invoice_id=${invoiceId}`);
      // Handle the DeliveryNoteList response structure
      const deliveryNotesData = response.data.delivery_notes || response.data || [];
      setDeliveryNotes(Array.isArray(deliveryNotesData) ? deliveryNotesData : []);
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      setDeliveryNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        invoice_id: invoiceId,
        delivery_date: new Date(formData.delivery_date).toISOString(),
      };

      if (editingNote) {
        await apiClient.put(`/delivery-notes/${editingNote.id}`, submitData);
      } else {
        await apiClient.post('/delivery-notes/', submitData);
      }
      
      await fetchDeliveryNotes();
      resetForm();
    } catch (error) {
      console.error('Error saving delivery note:', error);
    }
  };

  const handleEdit = (note: DeliveryNote) => {
    setEditingNote(note);
    setFormData({
      delivery_date: note.delivery_date.split('T')[0],
      delivery_address: note.delivery_address,
      delivery_contact_name: note.delivery_contact_name,
      delivery_contact_phone: note.delivery_contact_phone,
      driver_name: note.driver_name,
      vehicle_info: note.vehicle_info,
      tracking_number: note.tracking_number || '',
      notes: note.notes,
      items: note.items,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this delivery note?')) {
      try {
        await apiClient.delete(`/delivery-notes/${id}`);
        await fetchDeliveryNotes();
      } catch (error) {
        console.error('Error deleting delivery note:', error);
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/delivery-notes/${id}/status`, { status });
      await fetchDeliveryNotes();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updatedItems = [...formData.items];
    updatedItems[index].quantity_delivered = Math.min(quantity, updatedItems[index].quantity_remaining);
    setFormData({ ...formData, items: updatedItems });
  };

  const resetForm = () => {
    setFormData({
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_address: '',
      delivery_contact_name: '',
      delivery_contact_phone: '',
      driver_name: '',
      vehicle_info: '',
      tracking_number: '',
      notes: '',
      items: [],
    });
    setEditingNote(null);
    setShowForm(false);
  };



  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PREPARED: 'bg-blue-100 text-blue-800',
      IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Delivery Notes</h2>
            <p className="text-gray-600">Invoice: {invoiceNumber}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Delivery Note
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Delivery Notes List */}
        {!showForm && !showDetails && (
          <div className="space-y-4">
            {deliveryNotes.length === 0 ? (
              <div className="text-center py-12">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery notes</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a delivery note to track shipments for this invoice.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create First Delivery Note
                </button>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Note #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveryNotes.map((note) => (
                      <tr key={note.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {note.delivery_note_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(note.delivery_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {note.driver_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={note.status}
                            onChange={(e) => handleStatusChange(note.id, e.target.value)}
                            className={`text-xs font-semibold rounded-full px-2 py-1 border-none ${getStatusColor(note.status)}`}
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="PREPARED">Prepared</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {note.delivered_items}/{note.total_items}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedNote(note);
                                setShowDetails(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(note)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Delivery Note Form */}
        {showForm && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingNote ? 'Edit Delivery Note' : 'Create New Delivery Note'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address *
                </label>
                <textarea
                  required
                  value={formData.delivery_address}
                  onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_contact_name}
                    onChange={(e) => setFormData({ ...formData, delivery_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.delivery_contact_phone}
                    onChange={(e) => setFormData({ ...formData, delivery_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Info
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_info}
                    onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                    placeholder="License plate, vehicle type"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Items to Deliver</h4>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Ordered</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Previously Delivered</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deliver Now</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={index} className={item.is_fully_delivered ? 'bg-gray-50' : ''}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{item.item_name}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500">{item.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.quantity_ordered}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {item.total_delivered_so_far || 0}
                            {item.delivery_percentage > 0 && (
                              <div className="text-xs text-gray-400">
                                ({item.delivery_percentage.toFixed(1)}%)
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={`font-medium ${item.quantity_remaining === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                              {item.quantity_remaining}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity_remaining}
                              value={item.quantity_delivered}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                              disabled={item.quantity_remaining === 0}
                              className={`w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                                item.quantity_remaining === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {item.quantity_remaining === 0 ? (
                              <div className="flex items-center">
                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">Complete</span>
                              </div>
                            ) : item.quantity_delivered > 0 ? (
                              <div className="flex items-center">
                                <div className="h-2 w-12 bg-gray-200 rounded-full mr-2">
                                  <div 
                                    className="h-2 bg-blue-500 rounded-full" 
                                    style={{ width: `${(item.quantity_delivered / item.quantity_remaining) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-blue-600">Partial</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {formData.items.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No items available for delivery
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingNote ? 'Update' : 'Create'} Delivery Note
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delivery Note Details Modal */}
        {showDetails && selectedNote && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Delivery Note Details - {selectedNote.delivery_note_number}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Delivery Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedNote.delivery_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Driver</label>
                  <p className="text-sm text-gray-900">{selectedNote.driver_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Vehicle</label>
                  <p className="text-sm text-gray-900">{selectedNote.vehicle_info}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedNote.status)}`}>
                    {selectedNote.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Delivery Address</label>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedNote.delivery_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-sm text-gray-900">{selectedNote.delivery_contact_name}</p>
                  <p className="text-sm text-gray-900">{selectedNote.delivery_contact_phone}</p>
                </div>
                {selectedNote.tracking_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tracking Number</label>
                    <p className="text-sm text-gray-900">{selectedNote.tracking_number}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Items</label>
              <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedNote.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.item_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity_ordered}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity_delivered}</td>
                        <td className="px-4 py-2">
                          {item.quantity_delivered === item.quantity_ordered ? (
                            <span className="text-green-600 text-xs">Complete</span>
                          ) : item.quantity_delivered > 0 ? (
                            <span className="text-yellow-600 text-xs">Partial</span>
                          ) : (
                            <span className="text-gray-400 text-xs">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedNote.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="text-sm text-gray-900">{selectedNote.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryNoteManagement;

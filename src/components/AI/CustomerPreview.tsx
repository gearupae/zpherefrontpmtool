import React, { useState, useEffect } from 'react';
import { User, Building, Phone, Mail, MapPin, Save, Edit, CheckCircle, AlertCircle, X } from 'lucide-react';

interface CustomerData {
 firstName: string;
 lastName: string;
 phone: string;
 email: string;
 companyName: string;
 jobTitle: string;
 addressLine1: string;
 city: string;
 state: string;
 postalCode: string;
 country: string;
 customerType: 'prospect' | 'client' | 'lead';
 notes: string;
}

type PreviewState = 'Draft' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

interface CustomerPreviewProps {
 customerData: CustomerData;
 previewState: PreviewState;
 isEditing: boolean;
 savedCustomerId: string | null;
 fieldErrors: { [key: string]: string } | null;
 onSave: () => void;
 onEdit: () => void;
 onCancel: () => void;
 onDataChange: (data: Partial<CustomerData>) => void;
}

const CustomerPreview: React.FC<CustomerPreviewProps> = ({
 customerData,
 previewState,
 isEditing,
 savedCustomerId,
 fieldErrors,
 onSave,
 onEdit,
 onCancel,
 onDataChange,
}) => {
 const [localData, setLocalData] = useState<CustomerData>(customerData);

 useEffect(() => {
 setLocalData(customerData);
 }, [customerData]);

 const handleInputChange = (field: keyof CustomerData, value: string) => {
 const newData = { ...localData, [field]: value };
 setLocalData(newData);
 onDataChange(newData);
 };

 const getStatusIcon = () => {
 switch (previewState) {
 case 'Draft':
 return <Edit className="w-4 h-4 text-blue-500" />;
 case 'In Progress':
 return <AlertCircle className="w-4 h-4 text-yellow-500 animate-spin" />;
 case 'Completed':
 return <CheckCircle className="w-4 h-4 text-green-500" />;
 case 'On Hold':
 return <AlertCircle className="w-4 h-4 text-orange-500" />;
 case 'Cancelled':
 return <X className="w-4 h-4 text-red-500" />;
 default:
 return <Edit className="w-4 h-4 text-gray-500" />;
 }
 };

 const getStatusColor = () => {
 switch (previewState) {
 case 'Draft':
 return 'text-blue-600 bg-blue-50 border-blue-200';
 case 'In Progress':
 return 'text-yellow-600 bg-yellow-50 border-yellow-200';
 case 'Completed':
 return 'text-green-600 bg-green-50 border-green-200';
 case 'On Hold':
 return 'text-orange-600 bg-orange-50 border-orange-200';
 case 'Cancelled':
 return 'text-red-600 bg-red-50 border-red-200';
 default:
 return 'text-gray-600 bg-gray-50 border-gray-200';
 }
 };

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">Customer Preview</h3>
 <div className={`flex items-center gap-2 rounded-full border ${getStatusColor()}`}>
 {getStatusIcon()}
 <span className="text-sm font-medium">{previewState}</span>
 </div>
 </div>

 {/* Success Message */}
 {previewState === 'Completed' && savedCustomerId && (
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <div className="flex items-center gap-2">
 <CheckCircle className="w-5 h-5 text-green-500" />
 <div>
 <p className="text-green-800 font-medium">✅ Customer created successfully!</p>
 <p className="text-green-700 text-sm">ID: #{savedCustomerId}</p>
 </div>
 </div>
 </div>
 )}

 {/* Form */}
 <div className="space-y-4">
 {/* Basic Information */}
 <div className="border rounded-lg p-4">
 <div className="flex items-center gap-2 mb-3">
 <User className="w-4 h-4 text-gray-600" />
 <h4 className="font-medium text-gray-900">Basic Information</h4>
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 First Name *
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.firstName}
 onChange={(e) => handleInputChange('firstName', e.target.value)}
 className={`w-full py-2 border rounded-md text-sm ${
 fieldErrors?.firstName ? 'border-red-300' : 'border-gray-300'
 }`}
 placeholder="Enter first name"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.firstName || '-'}</p>
 )}
 {fieldErrors?.firstName && (
 <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Last Name *
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.lastName}
 onChange={(e) => handleInputChange('lastName', e.target.value)}
 className={`w-full py-2 border rounded-md text-sm ${
 fieldErrors?.lastName ? 'border-red-300' : 'border-gray-300'
 }`}
 placeholder="Enter last name"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.lastName || '-'}</p>
 )}
 {fieldErrors?.lastName && (
 <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>
 )}
 </div>
 </div>
 </div>

 {/* Contact Information */}
 <div className="border rounded-lg p-4">
 <div className="flex items-center gap-2 mb-3">
 <Phone className="w-4 h-4 text-gray-600" />
 <h4 className="font-medium text-gray-900">Contact Information</h4>
 </div>
 
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Phone
 </label>
 {isEditing ? (
 <input
 type="tel"
 value={localData.phone}
 onChange={(e) => handleInputChange('phone', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="+1 234 567 8900"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.phone || '-'}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Email *
 </label>
 {isEditing ? (
 <input
 type="email"
 value={localData.email}
 onChange={(e) => handleInputChange('email', e.target.value)}
 className={`w-full py-2 border rounded-md text-sm ${
 fieldErrors?.email ? 'border-red-300' : 'border-gray-300'
 }`}
 placeholder="email@company.com"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.email || '-'}</p>
 )}
 {fieldErrors?.email && (
 <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
 )}
 </div>
 </div>
 </div>

 {/* Company Information */}
 <div className="border rounded-lg p-4">
 <div className="flex items-center gap-2 mb-3">
 <Building className="w-4 h-4 text-gray-600" />
 <h4 className="font-medium text-gray-900">Company Information</h4>
 </div>
 
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Company Name
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.companyName}
 onChange={(e) => handleInputChange('companyName', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="Company Name"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.companyName || '-'}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Job Title
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.jobTitle}
 onChange={(e) => handleInputChange('jobTitle', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="CEO, CTO, etc."
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.jobTitle || '-'}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Customer Type
 </label>
 {isEditing ? (
 <select
 value={localData.customerType}
 onChange={(e) => handleInputChange('customerType', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 >
 <option value="prospect">Prospect</option>
 <option value="client">Client</option>
 <option value="lead">Lead</option>
 </select>
 ) : (
 <p className="py-2 text-sm text-gray-900 capitalize">{localData.customerType || 'prospect'}</p>
 )}
 </div>
 </div>
 </div>

 {/* Address */}
 <div className="border rounded-lg p-4">
 <div className="flex items-center gap-2 mb-3">
 <MapPin className="w-4 h-4 text-gray-600" />
 <h4 className="font-medium text-gray-900">Address</h4>
 </div>
 
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Address Line 1
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.addressLine1}
 onChange={(e) => handleInputChange('addressLine1', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="Street address"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.addressLine1 || '-'}</p>
 )}
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 City
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.city}
 onChange={(e) => handleInputChange('city', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="City"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.city || '-'}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 State
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.state}
 onChange={(e) => handleInputChange('state', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="State"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.state || '-'}</p>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Postal Code
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.postalCode}
 onChange={(e) => handleInputChange('postalCode', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="12345"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.postalCode || '-'}</p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 Country
 </label>
 {isEditing ? (
 <input
 type="text"
 value={localData.country}
 onChange={(e) => handleInputChange('country', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 placeholder="United States"
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.country || '-'}</p>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Notes */}
 <div className="border rounded-lg p-4">
 <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
 {isEditing ? (
 <textarea
 value={localData.notes}
 onChange={(e) => handleInputChange('notes', e.target.value)}
 className="w-full py-2 border border-gray-300 rounded-md text-sm"
 rows={3}
 placeholder="Additional notes about this customer..."
 />
 ) : (
 <p className="py-2 text-sm text-gray-900">{localData.notes || 'No notes added'}</p>
 )}
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex gap-3 pt-4 border-t">
 {isEditing ? (
 <>
 <button
 onClick={onSave}
 disabled={previewState === 'In Progress'}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Save className="w-4 h-4" />
 {previewState === 'In Progress' ? 'Saving...' : 'Save Customer'}
 </button>
 <button
 onClick={onCancel}
 disabled={previewState === 'In Progress'}
 className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
 >
 <X className="w-4 h-4" />
 </button>
 </>
 ) : (
 <button
 onClick={onEdit}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
 >
 <Edit className="w-4 h-4" />
 Edit Customer
 </button>
 )}
 </div>
 </div>
 );
};

export default CustomerPreview;
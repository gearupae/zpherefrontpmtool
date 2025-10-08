import React, { useState, useEffect } from 'react';
import { addNotification } from '../../store/slices/notificationSlice';
import { useAppDispatch } from '../../hooks/redux';
import { getCustomFields, createCustomField, updateCustomField, deactivateCustomField, CustomFieldDTO } from '../../api/customFields';
import { detectTenantContext } from '../../utils/tenantUtils';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentDuplicateIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
  TagIcon,
  CalendarIcon,
  HashtagIcon,
  CheckIcon,
  XMarkIcon,
  ListBulletIcon,
  PhotoIcon,
  LinkIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface CustomField {
  id: string;
  name: string;
  field_key: string;
  description?: string;
  field_type: string;
  field_options: any;
  default_value?: any;
  applies_to: string[];
  required_for: string[];
  display_order: number;
  is_visible: boolean;
  is_searchable: boolean;
  is_active: boolean;
  organization_id: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

interface FieldType {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  hasOptions: boolean;
  supportedAppliesTo: string[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface CustomFieldsManagerProps {
  entityType?: 'projects' | 'tasks' | 'customers' | 'teams' | 'goals' | 'proposals' | 'invoices' | 'vendors' | 'purchase_orders' | 'all';
  onFieldsChange?: (fields: CustomField[]) => void;
  mode?: 'full' | 'embedded';
}

const fieldTypes: FieldType[] = [
  {
    id: 'text',
    name: 'Text',
    icon: DocumentTextIcon,
    description: 'Single line text input',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'textarea',
    name: 'Long Text',
    icon: DocumentTextIcon,
    description: 'Multi-line text area',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'number',
    name: 'Number',
    icon: HashtagIcon,
    description: 'Numeric input with validation',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders'],
    validation: { min: 0, max: 999999 }
  },
  {
    id: 'email',
    name: 'Email',
    icon: DocumentTextIcon,
    description: 'Email address with validation',
    hasOptions: false,
    supportedAppliesTo: ['customers', 'vendors', 'teams']
  },
  {
    id: 'phone',
    name: 'Phone',
    icon: DocumentTextIcon,
    description: 'Phone number input',
    hasOptions: false,
    supportedAppliesTo: ['customers', 'vendors', 'teams']
  },
  {
    id: 'select',
    name: 'Dropdown',
    icon: ListBulletIcon,
    description: 'Single selection from predefined options',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'multi_select',
    name: 'Multi-Select',
    icon: CheckIcon,
    description: 'Multiple selections from predefined options',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'radio',
    name: 'Radio Buttons',
    icon: CheckIcon,
    description: 'Single selection with radio buttons',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'boolean',
    name: 'Checkbox',
    icon: CheckIcon,
    description: 'True/false checkbox',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'date',
    name: 'Date',
    icon: CalendarIcon,
    description: 'Date picker',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'datetime',
    name: 'Date & Time',
    icon: ClockIcon,
    description: 'Date and time picker',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'currency',
    name: 'Currency',
    icon: CurrencyDollarIcon,
    description: 'Monetary value with currency',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'customers', 'proposals', 'invoices', 'purchase_orders']
  },
  {
    id: 'url',
    name: 'URL',
    icon: LinkIcon,
    description: 'Web URL with validation',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'user',
    name: 'User',
    icon: UserIcon,
    description: 'User selection',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'teams', 'goals', 'proposals']
  },
  {
    id: 'file',
    name: 'File Upload',
    icon: PhotoIcon,
    description: 'File attachment',
    hasOptions: true,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  },
  {
    id: 'tags',
    name: 'Tags',
    icon: TagIcon,
    description: 'Freeform tags',
    hasOptions: false,
    supportedAppliesTo: ['projects', 'tasks', 'customers', 'teams', 'goals', 'proposals', 'invoices', 'vendors', 'purchase_orders']
  }
];

const CustomFieldsManager: React.FC<CustomFieldsManagerProps> = ({
  entityType = 'all',
  onFieldsChange,
  mode = 'full'
}) => {
  const dispatch = useAppDispatch();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [isAdminContext, setIsAdminContext] = useState(false);

  const [newField, setNewField] = useState({
    name: '',
    field_key: '',
    description: '',
    field_type: 'text',
    field_options: {},
    default_value: '',
    applies_to: entityType === 'all' ? ['projects'] : [entityType],
    required_for: [] as string[],
    is_visible: true,
    is_searchable: true,
    display_order: 0
  });

// Detect admin vs tenant context first
useEffect(() => {
  try {
    const { store } = require('../../store');
    const state = store.getState();
    const ctx = detectTenantContext(state?.auth?.user?.role, state?.auth?.user?.organization);
    setIsAdminContext(ctx.tenantType === 'admin');
  } catch (e) {
    setIsAdminContext(false);
  }
}, []);

// Load fields from API (tenant context only)
useEffect(() => {
  let mounted = true;
  (async () => {
    setIsLoading(true);
    try {
      if (isAdminContext) {
        // Skip fetch in admin context; backend endpoints are tenant-scoped
        setFields([]);
        return;
      }
      const list = await getCustomFields({ entityType, include_inactive: true });
      if (!mounted) return;
      // Map DTOs to local interface if needed
      const mapped: CustomField[] = ((list as any).fields || (list as any)).map((f: any) => ({
        id: f.id,
        name: f.field_label || f.field_name,
        field_key: f.field_name,
        description: f.description,
        field_type: f.field_type,
        field_options: {
          options: Array.isArray(f.options) ? f.options.map((opt: any) => opt?.label ?? opt?.value ?? String(opt)) : []
        },
        default_value: f.default_value,
        applies_to: [String(f.entity_type || '').endsWith('s') ? String(f.entity_type) : `${String(f.entity_type)}`],
        required_for: [],
        display_order: f.display_order ?? 0,
        is_visible: f.is_active ?? true,
        is_searchable: f.is_searchable ?? true,
        is_active: f.is_active ?? true,
        organization_id: f.organization_id || 'org',
        created_by_id: f.created_by_id || 'user',
        created_at: f.created_at || new Date().toISOString(),
        updated_at: f.updated_at || new Date().toISOString(),
      }));
      setFields(mapped);
    } catch (e: any) {
      console.error('Failed to load custom fields:', e);
      dispatch(addNotification({ type: 'error', title: 'Load Failed', message: e?.response?.data?.detail || 'Could not load custom fields', duration: 5000 }));
      setFields([]);
    } finally {
      if (mounted) setIsLoading(false);
    }
  })();
  return () => { mounted = false; };
}, [entityType, dispatch, isAdminContext]);

  const filteredFields = fields.filter(field => {
    if (!showInactive && !field.is_active) return false;
    if (entityType !== 'all' && !field.applies_to.includes(entityType)) return false;
    if (selectedCategory !== 'all' && field.field_type !== selectedCategory) return false;
    return true;
  });

const handleCreateField = async () => {
  try {
    if (isAdminContext) {
      dispatch(addNotification({ type: 'warning', title: 'Not Available in Admin', message: 'Custom fields can only be managed within a tenant space. Switch to a tenant to create fields.', duration: 5000 }));
      return;
    }
    const singularMap: Record<string, string> = {
      projects: 'project',
      tasks: 'task',
      customers: 'customer',
      teams: 'team',
      goals: 'goal',
      proposals: 'proposal',
      invoices: 'invoice',
      vendors: 'vendor',
      purchase_orders: 'purchase_order'
    };
    const selEntity = (entityType === 'all' ? 'projects' : entityType) as string;
    const entity = singularMap[selEntity] || 'project';
    const fieldName = (newField.field_key || newField.name || '').toString().toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const typeMap: Record<string, string> = { boolean: 'checkbox' };
    const mappedType = (typeMap[newField.field_type] || newField.field_type) as any;
    const optListCreate = (newField.field_options as any)?.options;
    const options = Array.isArray(optListCreate)
      ? optListCreate.map((o: any) => ({ label: String(o), value: String(o) }))
      : [];

    const payload = {
      field_name: fieldName,
      field_label: newField.name,
      entity_type: entity,
      field_type: mappedType,
      description: newField.description || undefined,
      options,
      is_required: false,
      is_active: true,
      is_searchable: newField.is_searchable ?? true,
      default_value: newField.default_value || undefined,
      display_order: fields.length + 1
    } as any;

    const created = await createCustomField(payload);
    const field: CustomField = {
      id: created.id,
      name: created.name,
      field_key: created.field_key,
      description: created.description,
      field_type: created.field_type,
      field_options: created.field_options || {},
      default_value: created.default_value,
      applies_to: created.applies_to,
      required_for: created.required_for || [],
      display_order: created.display_order ?? payload.display_order ?? 0,
      is_visible: created.is_visible ?? true,
      is_searchable: created.is_searchable ?? true,
      is_active: created.is_active ?? true,
      organization_id: 'org',
      created_by_id: 'user',
      created_at: created.created_at || new Date().toISOString(),
      updated_at: created.updated_at || new Date().toISOString(),
    };

    setFields(prev => [...prev, field]);
    setShowCreateForm(false);
    setNewField({
      name: '',
      field_key: '',
      description: '',
      field_type: 'text',
      field_options: {},
      default_value: '',
      applies_to: entityType === 'all' ? ['projects'] : [entityType],
      required_for: [],
      is_visible: true,
      is_searchable: true,
      display_order: 0
    });

    if (onFieldsChange) {
      onFieldsChange([...fields, field]);
    }

    dispatch(addNotification({ type: 'success', title: 'Custom Field Created', message: 'Field has been saved.', duration: 3000 }));
  } catch (e: any) {
    console.error('Failed to create custom field:', e);
    dispatch(addNotification({ type: 'error', title: 'Create Failed', message: e?.response?.data?.detail || 'Could not create custom field', duration: 5000 }));
  }
};

const handleUpdateField = async (field: CustomField) => {
  try {
    if (isAdminContext) {
      dispatch(addNotification({ type: 'warning', title: 'Not Available in Admin', message: 'Custom fields can only be managed within a tenant space. Switch to a tenant to update fields.', duration: 5000 }));
      return;
    }
    const typeMap: Record<string, string> = { boolean: 'checkbox' };
    const mappedType = (typeMap[field.field_type] || field.field_type) as any;
    const options = Array.isArray(field.field_options?.options)
      ? field.field_options.options.map((o: any) => ({ label: String(o), value: String(o) }))
      : undefined;

    const payload = {
      field_label: field.name,
      description: field.description,
      options,
      is_required: undefined,
      is_active: field.is_active,
      is_searchable: field.is_searchable,
      default_value: field.default_value,
      display_order: field.display_order,
    } as any;

    const updated = await updateCustomField(field.id, payload);

    const merged: CustomField = {
      ...field,
      ...updated,
      field_options: updated.field_options || field.field_options,
      applies_to: updated.applies_to || field.applies_to,
      required_for: updated.required_for || field.required_for,
      display_order: updated.display_order ?? field.display_order,
      is_visible: updated.is_visible ?? field.is_visible,
      is_searchable: updated.is_searchable ?? field.is_searchable,
      is_active: updated.is_active ?? field.is_active,
      updated_at: updated.updated_at || new Date().toISOString(),
    } as any;

    setFields(prev => prev.map(f => f.id === field.id ? merged : f));
    setEditingField(null);
    if (onFieldsChange) {
      onFieldsChange(fields.map(f => f.id === field.id ? merged : f));
    }
    dispatch(addNotification({ type: 'success', title: 'Custom Field Updated', message: 'Changes saved.', duration: 3000 }));
  } catch (e: any) {
    console.error('Failed to update custom field:', e);
    dispatch(addNotification({ type: 'error', title: 'Update Failed', message: e?.response?.data?.detail || 'Could not update custom field', duration: 5000 }));
  }
};

const handleDeleteField = async (fieldId: string) => {
  try {
    if (isAdminContext) {
      dispatch(addNotification({ type: 'warning', title: 'Not Available in Admin', message: 'Custom fields can only be managed within a tenant space. Switch to a tenant to delete fields.', duration: 5000 }));
      return;
    }
    const updated = await deactivateCustomField(fieldId);
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, is_active: false } : f));
    if (onFieldsChange) {
      onFieldsChange(fields.map(f => f.id === fieldId ? { ...f, is_active: false } : f));
    }
    dispatch(addNotification({ type: 'success', title: 'Field Deactivated', message: 'Field is now inactive.', duration: 3000 }));
  } catch (e: any) {
    console.error('Failed to deactivate custom field:', e);
    dispatch(addNotification({ type: 'error', title: 'Delete Failed', message: e?.response?.data?.detail || 'Could not delete custom field', duration: 5000 }));
  }
};

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    
    // Update display_order
    newFields.forEach((field, index) => {
      field.display_order = index + 1;
    });

    setFields(newFields);
    if (onFieldsChange) {
      onFieldsChange(newFields);
    }
  };

  const getFieldTypeInfo = (typeId: string) => {
    return fieldTypes.find(ft => ft.id === typeId) || fieldTypes[0];
  };

  const renderFieldOptions = (field: CustomField) => {
    const typeInfo = getFieldTypeInfo(field.field_type);
    
    if (field.field_type === 'select' || field.field_type === 'multi_select') {
      return (
        <div className="text-xs text-gray-500">
          Options: {field.field_options?.options?.join(', ') || 'None'}
        </div>
      );
    }
    
    if (field.field_type === 'number' || field.field_type === 'currency') {
      return (
        <div className="text-xs text-gray-500">
          Range: {field.field_options?.min || 0} - {field.field_options?.max || '∞'}
          {field.field_options?.suffix && ` (${field.field_options.suffix})`}
        </div>
      );
    }

    return null;
  };

  if (mode === 'embedded') {
    return (
      <div className="space-y-4">
        {isAdminContext && (
          <div className="p-3 border border-yellow-300 bg-yellow-50 text-yellow-900 text-sm rounded">
            Custom fields are tenant-specific. Switch to a tenant space to manage fields.
          </div>
        )}
        {isLoading && <div className="text-sm text-gray-500">Loading fields...</div>}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Custom Fields</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Field</span>
          </button>
        </div>

        <div className="space-y-2">
          {filteredFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                {React.createElement(getFieldTypeInfo(field.field_type).icon, { className: "w-4 h-4 text-gray-500" })}
                <div>
                  <div className="font-medium text-sm">{field.name}</div>
                  <div className="text-xs text-gray-500">{field.field_type}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {field.required_for.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">Required</span>
                )}
                <button
                  onClick={() => setEditingField(field)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-4">
        {isAdminContext && (
          <div className="p-3 border border-yellow-300 bg-yellow-50 text-yellow-900 text-sm rounded">
            Custom fields are tenant-specific and not available in the admin space. Switch to a tenant to view or edit custom fields.
          </div>
        )}
        {isLoading && (
          <div className="p-2 text-xs text-gray-600">Loading custom fields...</div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black">Custom Fields</h2>
            <p className="text-sm text-gray-600 mt-1">Create and manage custom fields for projects, tasks, and customers</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="text-sm">Create Field</span>
          </button>
        </div>

      {/* Filters */}
      <div className="bg-white rounded-md border border-gray-200 p-2.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-black">Filters</h3>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs border ${
              showInactive ? 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showInactive ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            <span>{showInactive ? 'Hide' : 'Show'} Inactive</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={entityType}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              disabled
            >
              <option value="all">All Types</option>
              <option value="projects">Projects</option>
              <option value="tasks">Tasks</option>
              <option value="customers">Customers</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Field Type</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="all">All Field Types</option>
              {fieldTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Statistics</label>
            <div className="text-xs text-gray-600">
              <div>Total: {fields.length}</div>
              <div>Active: {fields.filter(f => f.is_active).length}</div>
              <div>Required: {fields.filter(f => f.required_for.length > 0).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fields List */}
      <div className="bg-white rounded-md border border-gray-200">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <h3 className="text-sm font-medium text-black">{filteredFields.length} Custom Fields</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {filteredFields.length === 0 ? (
            <div className="p-4 text-center">
              <AdjustmentsHorizontalIcon className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-black">No custom fields</h3>
              <p className="mt-1 text-xs text-gray-500">Create your first custom field to customize your data</p>
            </div>
          ) : (
            filteredFields.map((field, index) => (
              <div key={field.id} className={`p-3 ${!field.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-1.5 bg-gray-100 rounded">
                      {React.createElement(getFieldTypeInfo(field.field_type).icon, { 
                        className: "w-5 h-5 text-gray-700" 
                      })}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1.5">
                        <h4 className="text-base font-semibold text-black">{field.name}</h4>
                        <span className="text-xs text-gray-500">({field.field_key})</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                          {getFieldTypeInfo(field.field_type).name}
                        </span>
                      </div>
                      
                      {field.description && (
                        <p className="text-sm text-gray-700 mb-2">{field.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Applies to:</span>
                          <span className="ml-1 text-gray-600">
                            {field.applies_to.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
                          </span>
                        </div>
                        
                        {field.required_for.length > 0 && (
                          <div>
                            <span className="font-medium text-gray-700">Required for:</span>
                            <span className="ml-1 text-gray-600">
                              {field.required_for.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3">
                          {field.is_visible && (
                            <span className="flex items-center text-gray-700">
                              <EyeIcon className="w-4 h-4 mr-1" />
                              Visible
                            </span>
                          )}
                          {field.is_searchable && (
                            <span className="flex items-center text-gray-700">
                              <InformationCircleIcon className="w-4 h-4 mr-1" />
                              Searchable
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {renderFieldOptions(field)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-gray-500">#{field.display_order}</span>
                    
                    <button
                      onClick={() => moveField(field.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-black disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => moveField(field.id, 'down')}
                      disabled={index === filteredFields.length - 1}
                      className="p-1 text-gray-500 hover:text-black disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => setEditingField(field)}
                      className="p-1.5 text-gray-700 hover:text-black border border-gray-300 rounded-md"
                      title="Edit field"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        const newField = { 
                          ...field, 
                          name: `${field.name} (Copy)`, 
                          field_key: `${field.field_key}_copy`,
                          description: field.description || '',
                          default_value: field.default_value || ''
                        };
                        setNewField({
                          name: newField.name,
                          field_key: newField.field_key,
                          description: newField.description,
                          field_type: newField.field_type,
                          field_options: newField.field_options,
                          default_value: newField.default_value,
                          applies_to: newField.applies_to,
                          required_for: newField.required_for,
                          is_visible: newField.is_visible,
                          is_searchable: newField.is_searchable,
                          display_order: newField.display_order
                        });
                        setShowCreateForm(true);
                      }}
                      className="p-1.5 text-gray-700 hover:text-black border border-gray-300 rounded-md"
                      title="Duplicate field"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    
                    {field.is_active ? (
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 border border-red-300 rounded-md"
                        title="Delete field"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-xs text-red-600 px-2 py-1 bg-red-100 rounded-full">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Field Modal */}
      {(showCreateForm || editingField) && (
        <FieldFormModal
          field={editingField}
          newField={newField}
          setNewField={setNewField}
          fieldTypes={fieldTypes}
          entityType={entityType}
          onSave={editingField ? handleUpdateField : handleCreateField}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
};

// Field Form Modal Component
const FieldFormModal: React.FC<{
  field?: CustomField | null;
  newField: any;
  setNewField: (field: any) => void;
  fieldTypes: FieldType[];
  entityType: string;
  onSave: (field?: any) => void;
  onCancel: () => void;
}> = ({ field, newField, setNewField, fieldTypes, entityType, onSave, onCancel }) => {
  const [formData, setFormData] = useState(field || newField);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedFieldType = fieldTypes.find(ft => ft.id === formData.field_type);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    }
    
    if (!formData.field_key.trim()) {
      newErrors.field_key = 'Field key is required';
    }
    
    if (formData.applies_to.length === 0) {
      newErrors.applies_to = 'At least one entity type must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {field ? 'Edit' : 'Create'} Custom Field
          </h3>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!formData.field_key || formData.field_key === formData.name.toLowerCase().replace(/\s+/g, '_')) {
                    setFormData((prev: any) => ({ ...prev, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }));
                  }
                }}
                className={`w-full border rounded-md px-3 py-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., Project Priority"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Key</label>
              <input
                type="text"
                value={formData.field_key}
                onChange={(e) => setFormData({ ...formData, field_key: e.target.value })}
                className={`w-full border rounded-md px-3 py-2 ${errors.field_key ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., project_priority"
              />
              {errors.field_key && <p className="text-red-500 text-xs mt-1">{errors.field_key}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={2}
              placeholder="Optional description of this field"
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {fieldTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, field_type: type.id, field_options: {} })}
                  className={`flex items-center space-x-2 p-3 border rounded-md text-left transition-colors ${
                    formData.field_type === type.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{type.name}</span>
                </button>
              ))}
            </div>
            {selectedFieldType && (
              <p className="text-sm text-gray-600 mt-2">{selectedFieldType.description}</p>
            )}
          </div>

          {/* Field Options */}
          {selectedFieldType?.hasOptions && (
            <FieldOptionsForm
              fieldType={formData.field_type}
              options={formData.field_options}
              onChange={(options) => setFormData({ ...formData, field_options: options })}
            />
          )}

          {/* Applies To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
            <div className="space-y-2">
              {['projects', 'tasks', 'customers'].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.applies_to.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, applies_to: [...formData.applies_to, type] });
                      } else {
                        setFormData({ ...formData, applies_to: formData.applies_to.filter((t: string) => t !== type) });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                </label>
              ))}
            </div>
            {errors.applies_to && <p className="text-red-500 text-xs mt-1">{errors.applies_to}</p>}
          </div>

          {/* Display Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Display Options</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_visible}
                  onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Visible in forms and lists</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_searchable}
                  onChange={(e) => setFormData({ ...formData, is_searchable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include in search results</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {field ? 'Update' : 'Create'} Field
          </button>
        </div>
      </div>
    </div>
  );
};

// Field Options Form Component
const FieldOptionsForm: React.FC<{
  fieldType: string;
  options: any;
  onChange: (options: any) => void;
}> = ({ fieldType, options, onChange }) => {
  if (fieldType === 'select' || fieldType === 'multi_select') {
    const optionsList = options.options || [];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
        <div className="space-y-2">
          {optionsList.map((option: string, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...optionsList];
                  newOptions[index] = e.target.value;
                  onChange({ ...options, options: newOptions });
                }}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                placeholder={`Option ${index + 1}`}
              />
              <button
                onClick={() => {
                  const newOptions = optionsList.filter((_: any, i: number) => i !== index);
                  onChange({ ...options, options: newOptions });
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              onChange({ ...options, options: [...optionsList, ''] });
            }}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Option</span>
          </button>
        </div>
      </div>
    );
  }

  if (fieldType === 'number' || fieldType === 'currency') {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Value</label>
          <input
            type="number"
            value={options.min || ''}
            onChange={(e) => onChange({ ...options, min: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Value</label>
          <input
            type="number"
            value={options.max || ''}
            onChange={(e) => onChange({ ...options, max: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
        {fieldType === 'number' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
            <input
              type="text"
              value={options.suffix || ''}
              onChange={(e) => onChange({ ...options, suffix: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., %, hours, etc."
            />
          </div>
        )}
      </div>
    );
  }

  if (fieldType === 'file') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">File Options</label>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Allowed File Types</label>
            <input
              type="text"
              value={options.allowed_types || ''}
              onChange={(e) => onChange({ ...options, allowed_types: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., .pdf,.doc,.jpg,.png"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max File Size (MB)</label>
            <input
              type="number"
              value={options.max_size_mb || ''}
              onChange={(e) => onChange({ ...options, max_size_mb: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="10"
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomFieldsManager;

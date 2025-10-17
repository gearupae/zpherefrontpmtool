import React, { useState, useEffect } from 'react';
import {
 CalendarIcon,
 UserIcon,
 TagIcon,
 DocumentIcon,
 LinkIcon,
 PhotoIcon,
 CheckIcon,
 InformationCircleIcon,
 ExclamationTriangleIcon,
 ClockIcon
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
 is_visible: boolean;
 is_searchable: boolean;
 is_active: boolean;
}

interface CustomFieldRendererProps {
 fields: CustomField[];
 entityType: 'projects' | 'tasks' | 'customers';
 values: Record<string, any>;
 onChange: (key: string, value: any) => void;
 mode: 'create' | 'edit' | 'view';
 errors?: Record<string, string>;
 compact?: boolean;
 showOptional?: boolean;
}

interface FieldComponentProps {
 field: CustomField;
 value: any;
 onChange: (value: any) => void;
 error?: string;
 disabled?: boolean;
 compact?: boolean;
}

const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({
 fields,
 entityType,
 values,
 onChange,
 mode,
 errors = {},
 compact = false,
 showOptional = true
}) => {
 const [expandedSections, setExpandedSections] = useState<string[]>(['required']);

 // Filter fields applicable to this entity type
 const applicableFields = fields.filter(field => 
 field.is_active && 
 field.is_visible && 
 field.applies_to.includes(entityType)
 );

 // Separate required and optional fields
 const requiredFields = applicableFields.filter(field => 
 field.required_for.includes(entityType)
 );
 const optionalFields = applicableFields.filter(field => 
 !field.required_for.includes(entityType)
 );

 // Initialize default values
 useEffect(() => {
 applicableFields.forEach(field => {
 if (values[field.field_key] === undefined && field.default_value !== undefined) {
 onChange(field.field_key, field.default_value);
 }
 });
 }, [applicableFields, values, onChange]);

 const toggleSection = (section: string) => {
 setExpandedSections(prev => 
 prev.includes(section) 
 ? prev.filter(s => s !== section)
 : [...prev, section]
 );
 };

 const renderField = (field: CustomField) => {
 const fieldProps: FieldComponentProps = {
 field,
 value: values[field.field_key],
 onChange: (value) => onChange(field.field_key, value),
 error: errors[field.field_key],
 disabled: mode === 'view',
 compact
 };

 return (
 <div key={field.id} className={compact ? 'mb-3' : 'mb-4'}>
 <FieldComponent {...fieldProps} />
 </div>
 );
 };

 if (applicableFields.length === 0) {
 return null;
 }

 return (
 <div className="space-y-4">
 {/* Required Fields */}
 {requiredFields.length > 0 && (
 <div className="bg-white border border-gray-200 rounded-lg">
 <button
 type="button"
 onClick={() => toggleSection('required')}
 className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50"
 >
 <div className="flex items-center space-x-2">
 <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
 <h3 className="text-lg font-medium text-gray-900">
 Required Fields ({requiredFields.length})
 </h3>
 </div>
 <svg
 className={`w-5 h-5 text-gray-500 transform transition-transform ${
 expandedSections.includes('required') ? 'rotate-180' : ''
 }`}
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>
 
 {expandedSections.includes('required') && (
 <div className={`p-4 space-y-${compact ? '3' : '4'}`}>
 {requiredFields.map(renderField)}
 </div>
 )}
 </div>
 )}

 {/* Optional Fields */}
 {optionalFields.length > 0 && showOptional && (
 <div className="bg-white border border-gray-200 rounded-lg">
 <button
 type="button"
 onClick={() => toggleSection('optional')}
 className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-200 hover:bg-gray-50"
 >
 <div className="flex items-center space-x-2">
 <InformationCircleIcon className="w-5 h-5 text-blue-500" />
 <h3 className="text-lg font-medium text-gray-900">
 Additional Fields ({optionalFields.length})
 </h3>
 </div>
 <svg
 className={`w-5 h-5 text-gray-500 transform transition-transform ${
 expandedSections.includes('optional') ? 'rotate-180' : ''
 }`}
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
 </svg>
 </button>
 
 {expandedSections.includes('optional') && (
 <div className={`p-4 space-y-${compact ? '3' : '4'}`}>
 {optionalFields.map(renderField)}
 </div>
 )}
 </div>
 )}

 {/* Compact mode - render all fields inline */}
 {compact && !requiredFields.length && !optionalFields.length && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {applicableFields.map(renderField)}
 </div>
 )}
 </div>
 );
};

// Individual Field Component
const FieldComponent: React.FC<FieldComponentProps> = ({
 field,
 value,
 onChange,
 error,
 disabled = false,
 compact = false
}) => {
 const isRequired = field.required_for.length > 0;
 const hasError = !!error;

 const labelClasses = `block text-sm font-medium ${
 hasError ? 'text-red-700' : 'text-gray-700'
 } ${compact ? 'mb-1' : 'mb-2'}`;

 const inputClasses = `w-full rounded-md py-2 border ${
 hasError 
 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
 : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
 } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''} ${
 compact ? 'text-sm' : ''
 }`;

 const renderInput = () => {
 switch (field.field_type) {
 case 'text':
 return (
 <input
 type="text"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 placeholder={field.description}
 disabled={disabled}
 />
 );

 case 'textarea':
 return (
 <textarea
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 placeholder={field.description}
 disabled={disabled}
 rows={compact ? 2 : 3}
 />
 );

 case 'number':
 return (
 <div className="relative">
 <input
 type="number"
 value={value || ''}
 onChange={(e) => onChange(Number(e.target.value))}
 className={inputClasses}
 placeholder={field.description}
 disabled={disabled}
 min={field.field_options?.min}
 max={field.field_options?.max}
 step={field.field_options?.decimal_places ? `0.${'0'.repeat(field.field_options.decimal_places - 1)}1` : '1'}
 />
 {field.field_options?.suffix && (
 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
 <span className="text-gray-500 text-sm">{field.field_options.suffix}</span>
 </div>
 )}
 </div>
 );

 case 'currency':
 return (
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
 <span className="text-gray-500 text-sm">$</span>
 </div>
 <input
 type="number"
 value={value || ''}
 onChange={(e) => onChange(Number(e.target.value))}
 className={`${inputClasses} pl-8`}
 placeholder="0.00"
 disabled={disabled}
 min={0}
 step="0.01"
 />
 </div>
 );

 case 'select':
 return (
 <select
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 disabled={disabled}
 >
 <option value="">Select {field.name}</option>
 {field.field_options?.options?.map((option: string) => (
 <option key={option} value={option}>
 {option}
 </option>
 ))}
 </select>
 );

 case 'multi_select':
 return (
 <div className="space-y-2">
 {field.field_options?.options?.map((option: string) => (
 <label key={option} className="flex items-center">
 <input
 type="checkbox"
 checked={(value || []).includes(option)}
 onChange={(e) => {
 const currentValues = value || [];
 if (e.target.checked) {
 onChange([...currentValues, option]);
 } else {
 onChange(currentValues.filter((v: string) => v !== option));
 }
 }}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 disabled={disabled}
 />
 <span className="ml-2 text-sm text-gray-700">{option}</span>
 </label>
 ))}
 </div>
 );

 case 'boolean':
 return (
 <div className="flex items-center">
 <input
 type="checkbox"
 checked={value || false}
 onChange={(e) => onChange(e.target.checked)}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 disabled={disabled}
 />
 <span className="ml-2 text-sm text-gray-700">
 {field.description || `Enable ${field.name}`}
 </span>
 </div>
 );

 case 'date':
 return (
 <div className="relative">
 <input
 type="date"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 disabled={disabled}
 />
 <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
 </div>
 );

 case 'datetime':
 return (
 <div className="relative">
 <input
 type="datetime-local"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 disabled={disabled}
 />
 <ClockIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
 </div>
 );

 case 'url':
 return (
 <div className="relative">
 <input
 type="url"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 placeholder="https://example.com"
 disabled={disabled}
 />
 <LinkIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
 </div>
 );

 case 'user':
 return (
 <div className="relative">
 <select
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 disabled={disabled}
 >
 <option value="">Select User</option>
 {/* This would be populated with actual users */}
 <option value="user1">John Doe</option>
 <option value="user2">Jane Smith</option>
 </select>
 <UserIcon className="absolute right-8 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
 </div>
 );

 case 'file':
 return (
 <FileUploadField
 value={value}
 onChange={onChange}
 options={field.field_options}
 disabled={disabled}
 compact={compact}
 />
 );

 case 'tags':
 return (
 <TagsField
 value={value || []}
 onChange={onChange}
 placeholder={`Add ${field.name.toLowerCase()}`}
 disabled={disabled}
 compact={compact}
 />
 );

 default:
 return (
 <input
 type="text"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 className={inputClasses}
 placeholder={field.description}
 disabled={disabled}
 />
 );
 }
 };

 return (
 <div>
 <label className={labelClasses}>
 {field.name}
 {isRequired && <span className="text-red-500 ml-1">*</span>}
 </label>
 
 {field.description && !compact && (
 <p className="text-sm text-gray-600 mb-2">{field.description}</p>
 )}
 
 {renderInput()}
 
 {error && (
 <p className="text-red-500 text-sm mt-1">{error}</p>
 )}
 </div>
 );
};

// File Upload Field Component
const FileUploadField: React.FC<{
 value: any;
 onChange: (value: any) => void;
 options: any;
 disabled: boolean;
 compact: boolean;
}> = ({ value, onChange, options, disabled, compact }) => {
 const [isDragging, setIsDragging] = useState(false);

 const handleFileSelect = (files: FileList | null) => {
 if (!files || files.length === 0) return;

 const file = files[0];
 
 // Check file type
 if (options.allowed_types) {
 const allowedTypes = options.allowed_types.split(',').map((t: string) => t.trim());
 const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
 if (!allowedTypes.includes(fileExtension)) {
 alert(`File type not allowed. Allowed types: ${options.allowed_types}`);
 return;
 }
 }

 // Check file size
 if (options.max_size_mb && file.size > options.max_size_mb * 1024 * 1024) {
 alert(`File too large. Maximum size: ${options.max_size_mb}MB`);
 return;
 }

 onChange({
 name: file.name,
 size: file.size,
 type: file.type,
 url: URL.createObjectURL(file) // This would be replaced with actual upload logic
 });
 };

 return (
 <div>
 {value ? (
 <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
 <div className="flex items-center space-x-2">
 <DocumentIcon className="w-5 h-5 text-gray-500" />
 <span className="text-sm text-gray-700">{value.name}</span>
 <span className="text-xs text-gray-500">
 ({(value.size / 1024).toFixed(1)} KB)
 </span>
 </div>
 {!disabled && (
 <button
 type="button"
 onClick={() => onChange(null)}
 className="text-red-600 hover:text-red-700 text-sm"
 >
 Remove
 </button>
 )}
 </div>
 ) : (
 <div
 className={`border-2 border-dashed rounded-md p-4 text-center ${
 isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
 } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}`}
 onDragOver={(e) => {
 e.preventDefault();
 if (!disabled) setIsDragging(true);
 }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={(e) => {
 e.preventDefault();
 setIsDragging(false);
 if (!disabled) handleFileSelect(e.dataTransfer.files);
 }}
 onClick={() => {
 if (!disabled) {
 const input = document.createElement('input');
 input.type = 'file';
 if (options.allowed_types) {
 input.accept = options.allowed_types;
 }
 input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
 input.click();
 }
 }}
 >
 <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
 <p className="mt-2 text-sm text-gray-600">
 {disabled ? 'File upload disabled' : 'Click to upload or drag and drop'}
 </p>
 {options.allowed_types && (
 <p className="text-xs text-gray-500 mt-1">
 Allowed: {options.allowed_types}
 </p>
 )}
 </div>
 )}
 </div>
 );
};

// Tags Field Component
const TagsField: React.FC<{
 value: string[];
 onChange: (value: string[]) => void;
 placeholder: string;
 disabled: boolean;
 compact: boolean;
}> = ({ value, onChange, placeholder, disabled, compact }) => {
 const [inputValue, setInputValue] = useState('');

 const addTag = (tag: string) => {
 const trimmedTag = tag.trim();
 if (trimmedTag && !value.includes(trimmedTag)) {
 onChange([...value, trimmedTag]);
 }
 setInputValue('');
 };

 const removeTag = (tagToRemove: string) => {
 onChange(value.filter(tag => tag !== tagToRemove));
 };

 return (
 <div>
 {value.length > 0 && (
 <div className="flex flex-wrap gap-2 mb-2">
 {value.map((tag, index) => (
 <span
 key={index}
 className="inline-flex items-center px-2 rounded-full text-xs bg-blue-100 text-blue-800"
 >
 <TagIcon className="w-3 h-3 mr-1" />
 {tag}
 {!disabled && (
 <button
 type="button"
 onClick={() => removeTag(tag)}
 className="ml-1 text-blue-600 hover:text-blue-800"
 >
 ×
 </button>
 )}
 </span>
 ))}
 </div>
 )}
 
 {!disabled && (
 <input
 type="text"
 value={inputValue}
 onChange={(e) => setInputValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ',') {
 e.preventDefault();
 addTag(inputValue);
 } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
 removeTag(value[value.length - 1]);
 }
 }}
 placeholder={placeholder}
 className="w-full border border-gray-300 rounded-md py-2 focus:border-blue-500 focus:ring-blue-500"
 />
 )}
 </div>
 );
};

export default CustomFieldRenderer;

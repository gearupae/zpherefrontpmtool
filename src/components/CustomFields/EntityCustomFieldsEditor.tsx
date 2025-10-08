import React, { useEffect, useState } from 'react';
import { getCustomFields } from '../../api/customFields';
import apiClient from '../../api/client';

interface Props {
  entityType: 'project' | 'task' | 'customer' | 'team' | 'goal' | 'proposal' | 'invoice' | 'vendor' | 'purchase_order';
  entityId: string;
  values?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  className?: string;
}

interface FieldDef {
  id: string;
  field_name: string; // internal key
  field_label: string; // display label
  field_type: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  is_required?: boolean;
  is_active?: boolean;
  is_searchable?: boolean;
  default_value?: any;
  display_order?: number;
}

const typeIsMulti = (t: string) => t === 'multi_select' || t === 'tags';

const EntityCustomFieldsEditor: React.FC<Props> = ({ entityType, entityId, values: initialValues, onChange, className }) => {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, any>>(initialValues || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch definitions
        const defs = await getCustomFields({ entityType: `${entityType}s`, include_inactive: true });
        const mapped: FieldDef[] = (defs as any[]).map((d: any) => ({
          id: d.id || d.id,
          field_name: d.field_name || d.field_key || d.name,
          field_label: d.field_label || d.name,
          field_type: d.field_type,
          description: d.description,
          options: (d.options || d.field_options?.options || []).map((o: any) => ({ label: o.label ?? String(o), value: o.value ?? String(o) })),
          is_required: d.is_required,
          is_active: d.is_active,
          is_searchable: d.is_searchable,
          default_value: d.default_value,
          display_order: d.display_order,
        }))
        .filter(fd => fd.field_name);

        // Fetch current values
        let current: Record<string, any> = {};
        try {
          const res = await apiClient.get(`/custom-fields/values/${entityType}/${entityId}`);
          current = (res.data?.values || {}) as Record<string, any>;
        } catch (e) {
          // If 404 or none, ignore
        }

        if (!mounted) return;
        setFields(mapped);
        const next = { ...current, ...(initialValues || {}) };
        setValues(next);
        onChange?.(next);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.detail || 'Failed to load custom fields');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const updateValue = (key: string, val: any) => {
    const next = { ...values, [key]: val };
    setValues(next);
    onChange?.(next);
  };

  if (loading) {
    return <div className={className || ''}><div className="text-sm text-gray-500">Loading custom fields…</div></div>;
  }
  if (error) {
    return <div className={className || ''}><div className="text-sm text-red-600">{error}</div></div>;
  }
  if (!fields.length) {
    return <div className={className || ''}><div className="text-sm text-gray-500">No custom fields defined.</div></div>;
  }

  return (
    <div className={className || ''}>
      <h4 className="text-md font-medium text-gray-900 mb-3">Custom Fields</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const key = f.field_name;
          const val = values[key] ?? f.default_value ?? '';
          const commonLabel = (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {f.field_label}{f.is_required ? ' *' : ''}
            </label>
          );

          if (f.field_type === 'text' || f.field_type === 'email' || f.field_type === 'url' || f.field_type === 'phone' || f.field_type === 'user') {
            return (
              <div key={f.id || key}>
                {commonLabel}
                <input
                  type="text"
                  value={val || ''}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            );
          }
          if (f.field_type === 'textarea') {
            return (
              <div key={f.id || key} className="md:col-span-2">
                {commonLabel}
                <textarea
                  rows={3}
                  value={val || ''}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            );
          }
          if (f.field_type === 'number' || f.field_type === 'currency') {
            return (
              <div key={f.id || key}>
                {commonLabel}
                <input
                  type="number"
                  value={val ?? ''}
                  onChange={(e) => updateValue(key, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            );
          }
          if (f.field_type === 'date' || f.field_type === 'datetime') {
            const formatted = typeof val === 'string' ? val.split('T')[0] : '';
            return (
              <div key={f.id || key}>
                {commonLabel}
                <input
                  type="date"
                  value={formatted || ''}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            );
          }
          if (f.field_type === 'checkbox' || f.field_type === 'boolean') {
            return (
              <div key={f.id || key} className="flex items-center">
                <input
                  id={`cf_${key}`}
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => updateValue(key, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`cf_${key}`} className="ml-2 text-sm text-gray-700">{f.field_label}</label>
              </div>
            );
          }
          if (f.field_type === 'select' || f.field_type === 'radio' || f.field_type === 'multi_select' || f.field_type === 'tags') {
            const options = f.options || [];
            if (typeIsMulti(f.field_type)) {
              const selected = Array.isArray(val) ? (val as any[]).map(String) : (val ? String(val).split(',').map(s => s.trim()) : []);
              return (
                <div key={f.id || key}>
                  {commonLabel}
                  <select
                    multiple
                    value={selected}
                    onChange={(e) => {
                      const sel = Array.from(e.target.selectedOptions).map(o => o.value);
                      updateValue(key, sel);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
                </div>
              );
            }
            return (
              <div key={f.id || key}>
                {commonLabel}
                <select
                  value={val || ''}
                  onChange={(e) => updateValue(key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select…</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {f.description && <p className="text-xs text-gray-500 mt-1">{f.description}</p>}
              </div>
            );
          }
          // Fallback to text
          return (
            <div key={f.id || key}>
              {commonLabel}
              <input
                type="text"
                value={val || ''}
                onChange={(e) => updateValue(key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EntityCustomFieldsEditor;

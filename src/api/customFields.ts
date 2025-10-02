import apiClient from './client';

export interface CustomFieldDTO {
  id: string;
  name: string;
  field_key: string;
  description?: string;
  field_type: string;
  field_options?: any;
  default_value?: any;
  applies_to: string[];
  required_for: string[];
  display_order: number;
  is_visible: boolean;
  is_searchable: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CustomFieldCreateDTO {
  name: string;
  field_key: string;
  description?: string;
  field_type: string;
  field_options?: any;
  default_value?: any;
  applies_to: string[];
  required_for?: string[];
  display_order?: number;
  is_visible?: boolean;
  is_searchable?: boolean;
}

export interface CustomFieldUpdateDTO extends Partial<CustomFieldCreateDTO> {
  is_active?: boolean;
}

export async function getCustomFields(params?: { entityType?: string; include_inactive?: boolean }): Promise<CustomFieldDTO[]> {
  const query: Record<string, any> = {};
  if (params?.entityType && params.entityType !== 'all') query.entity = params.entityType;
  if (typeof params?.include_inactive === 'boolean') query.include_inactive = params.include_inactive;
  const res = await apiClient.get('/custom-fields/', { params: query });
  return Array.isArray(res.data) ? res.data : (res.data?.fields || []);
}

export async function createCustomField(payload: CustomFieldCreateDTO): Promise<CustomFieldDTO> {
  const res = await apiClient.post('/custom-fields/', payload);
  return res.data as CustomFieldDTO;
}

export async function updateCustomField(id: string, payload: CustomFieldUpdateDTO): Promise<CustomFieldDTO> {
  const res = await apiClient.put(`/custom-fields/${id}`, payload);
  return res.data as CustomFieldDTO;
}

export async function deactivateCustomField(id: string): Promise<CustomFieldDTO> {
  const res = await apiClient.put(`/custom-fields/${id}`, { is_active: false });
  return res.data as CustomFieldDTO;
}

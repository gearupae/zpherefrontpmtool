import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface ChangeRequestFormProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  isEdit?: boolean;
}

interface ImpactAssessment {
  time_impact: number;
  cost_impact: number;
  resource_impact: string[];
  timeline_impact: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const ChangeRequestForm: React.FC<ChangeRequestFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false
}) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    change_type: 'scope_addition',
    priority: 'medium',
    business_justification: '',
    expected_benefits: [''],
    risk_assessment: '',
    time_impact_hours: 0,
    cost_impact: 0,
    resource_impact: {},
    timeline_impact_days: 0,
    overall_impact: 'medium',
    technical_requirements: [''],
    implementation_approach: '',
    testing_requirements: [''],
    required_by_date: '',
    approvers: [''],
    supporting_documents: ['']
  });

  const [impactAssessment, setImpactAssessment] = useState<ImpactAssessment | null>(null);
  const [isCalculatingImpact, setIsCalculatingImpact] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field as keyof typeof prev] as string[]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const addArrayField = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field as keyof typeof prev] as string[], '']
    }));
  };

  const removeArrayField = (field: string, index: number) => {
    setFormData(prev => {
      const newArray = [...prev[field as keyof typeof prev] as string[]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray.length > 0 ? newArray : ['']
      };
    });
  };

  const calculateImpactAssessment = async () => {
    setIsCalculatingImpact(true);
    try {
      // Simulate impact calculation
      setTimeout(() => {
        const baseImpact = {
          time_impact: formData.time_impact_hours,
          cost_impact: formData.cost_impact,
          resource_impact: ['Development Team', 'QA Team'],
          timeline_impact: formData.timeline_impact_days,
          risk_level: formData.overall_impact as 'low' | 'medium' | 'high' | 'critical'
        };

        // Add some intelligent calculation based on change type
        if (formData.change_type === 'scope_addition') {
          baseImpact.time_impact *= 1.2; // Additional overhead
          baseImpact.cost_impact *= 1.1;
        }

        setImpactAssessment(baseImpact);
        setIsCalculatingImpact(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to calculate impact:', error);
      setIsCalculatingImpact(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.business_justification.trim()) {
      newErrors.business_justification = 'Business justification is required';
    }

    if (formData.time_impact_hours < 0) {
      newErrors.time_impact_hours = 'Time impact cannot be negative';
    }

    if (formData.cost_impact < 0) {
      newErrors.cost_impact = 'Cost impact cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        project_id: projectId,
        expected_benefits: formData.expected_benefits.filter(b => b.trim()),
        technical_requirements: formData.technical_requirements.filter(r => r.trim()),
        testing_requirements: formData.testing_requirements.filter(r => r.trim()),
        approvers: formData.approvers.filter(a => a.trim()),
        supporting_documents: formData.supporting_documents.filter(d => d.trim())
      };

      if (onSubmit) {
        await onSubmit(submitData);
      } else {
        // Default API call
        const url = isEdit ? `/api/v1/change-requests/${initialData?.id}` : `/api/v1/projects/${projectId}/change-requests`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify(submitData)
        });

        if (!response.ok) {
          throw new Error('Failed to save change request');
        }

        // Show success message or redirect
        alert(isEdit ? 'Change request updated successfully!' : 'Change request created successfully!');
      }
    } catch (error) {
      console.error('Failed to submit change request:', error);
      alert('Failed to save change request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Change Request' : 'New Change Request'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Submit a formal request to change the project scope
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : ''
                  }`}
                  placeholder="Brief title for the change request"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : ''
                  }`}
                  placeholder="Detailed description of the requested change"
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
            </div>

            {/* Change Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="change_type" className="block text-sm font-medium text-gray-700">
                  Change Type
                </label>
                <select
                  id="change_type"
                  name="change_type"
                  value={formData.change_type}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="scope_addition">Scope Addition</option>
                  <option value="scope_modification">Scope Modification</option>
                  <option value="scope_removal">Scope Removal</option>
                  <option value="requirement_change">Requirement Change</option>
                  <option value="technical_change">Technical Change</option>
                  <option value="resource_change">Resource Change</option>
                  <option value="timeline_change">Timeline Change</option>
                  <option value="budget_change">Budget Change</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="overall_impact" className="block text-sm font-medium text-gray-700">
                  Overall Impact
                </label>
                <select
                  id="overall_impact"
                  name="overall_impact"
                  value={formData.overall_impact}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="minimal">Minimal</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Business Justification */}
            <div>
              <label htmlFor="business_justification" className="block text-sm font-medium text-gray-700">
                Business Justification *
              </label>
              <textarea
                id="business_justification"
                name="business_justification"
                value={formData.business_justification}
                onChange={handleInputChange}
                rows={3}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  errors.business_justification ? 'border-red-300' : ''
                }`}
                placeholder="Explain why this change is necessary and beneficial"
              />
              {errors.business_justification && (
                <p className="mt-1 text-sm text-red-600">{errors.business_justification}</p>
              )}
            </div>

            {/* Expected Benefits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Benefits
              </label>
              {formData.expected_benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleArrayFieldChange('expected_benefits', index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Describe a benefit of this change"
                  />
                  {formData.expected_benefits.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArrayField('expected_benefits', index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayField('expected_benefits')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Benefit
              </button>
            </div>

            {/* Impact Assessment */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Impact Assessment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label htmlFor="time_impact_hours" className="block text-sm font-medium text-gray-700">
                    Time Impact (hours)
                  </label>
                  <input
                    type="number"
                    id="time_impact_hours"
                    name="time_impact_hours"
                    value={formData.time_impact_hours}
                    onChange={handleInputChange}
                    min="0"
                    step="0.5"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="cost_impact" className="block text-sm font-medium text-gray-700">
                    Cost Impact ($)
                  </label>
                  <input
                    type="number"
                    id="cost_impact"
                    name="cost_impact"
                    value={formData.cost_impact}
                    onChange={handleInputChange}
                    min="0"
                    step="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="timeline_impact_days" className="block text-sm font-medium text-gray-700">
                    Timeline Impact (days)
                  </label>
                  <input
                    type="number"
                    id="timeline_impact_days"
                    name="timeline_impact_days"
                    value={formData.timeline_impact_days}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={calculateImpactAssessment}
                disabled={isCalculatingImpact}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isCalculatingImpact ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </>
                ) : (
                  'Calculate Impact Assessment'
                )}
              </button>

              {impactAssessment && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Assessment Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Time Impact:</span>
                      <div className="font-medium">{impactAssessment.time_impact.toFixed(1)}h</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost Impact:</span>
                      <div className="font-medium">${impactAssessment.cost_impact.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Timeline:</span>
                      <div className="font-medium">{impactAssessment.timeline_impact} days</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Risk Level:</span>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(impactAssessment.risk_level)}`}>
                        {impactAssessment.risk_level}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Required Date */}
            <div>
              <label htmlFor="required_by_date" className="block text-sm font-medium text-gray-700">
                Required By Date
              </label>
              <input
                type="date"
                id="required_by_date"
                name="required_by_date"
                value={formData.required_by_date}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Request' : 'Submit Request')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChangeRequestForm;

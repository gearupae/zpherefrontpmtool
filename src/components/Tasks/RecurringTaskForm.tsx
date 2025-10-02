import React, { useState } from 'react';
import { 
  ArrowPathIcon, 
  CalendarIcon, 
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface RecurringTaskFormProps {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RecurringTaskForm: React.FC<RecurringTaskFormProps> = ({
  projectId,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    task_type: 'task',
    estimated_hours: '',
    story_points: '',
    default_assignee_id: '',
    frequency: 'weekly',
    interval_value: 1,
    days_of_week: [] as number[],
    day_of_month: '',
    months_of_year: [] as number[],
    start_date: '',
    end_date: '',
    max_occurrences: '',
    advance_creation_days: 0,
    skip_weekends: false,
    skip_holidays: false,
    labels: [] as string[],
    tags: [] as string[]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTag, setNewTag] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { default: apiClient } = await import('../../api/client');
      
      const payload = {
        ...formData,
        project_id: projectId,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        story_points: formData.story_points ? parseInt(formData.story_points) : null,
        day_of_month: formData.day_of_month ? parseInt(formData.day_of_month) : null,
        max_occurrences: formData.max_occurrences ? parseInt(formData.max_occurrences) : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      await apiClient.post('/recurring-tasks/', payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create recurring task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()]
      }));
      setNewLabel('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const weekDays = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <ArrowPathIcon className="h-6 w-6 text-user-blue" />
              <h2 className="text-xl font-semibold text-text-primary">Create Recurring Task</h2>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary border-b border-border pb-2">
                Task Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Type
                  </label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                  >
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="epic">Epic</option>
                    <option value="story">Story</option>
                    <option value="subtask">Subtask</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    min="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    value={formData.story_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, story_points: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Recurrence Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary border-b border-border pb-2">
                Recurrence Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Every X {formData.frequency.replace('ly', '')}(s)
                  </label>
                  <input
                    type="number"
                    value={formData.interval_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, interval_value: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>

              {/* Weekly options */}
              {formData.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Days of Week
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                          formData.days_of_week.includes(day.value)
                            ? 'bg-user-blue text-white border-user-blue'
                            : 'bg-background text-text-secondary border-border hover:bg-surface'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly options */}
              {formData.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Day of Month (1-31)
                  </label>
                  <input
                    type="number"
                    value={formData.day_of_month}
                    onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    min="1"
                    max="31"
                    placeholder="e.g., 15 for 15th of each month"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Maximum Occurrences (optional)
                </label>
                <input
                  type="number"
                  value={formData.max_occurrences}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_occurrences: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-user-blue focus:border-transparent"
                  min="1"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="skip_weekends"
                    checked={formData.skip_weekends}
                    onChange={(e) => setFormData(prev => ({ ...prev, skip_weekends: e.target.checked }))}
                    className="h-4 w-4 text-user-blue focus:ring-user-blue border-border rounded"
                  />
                  <label htmlFor="skip_weekends" className="ml-2 text-sm text-text-secondary">
                    Skip weekends
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="skip_holidays"
                    checked={formData.skip_holidays}
                    onChange={(e) => setFormData(prev => ({ ...prev, skip_holidays: e.target.checked }))}
                    className="h-4 w-4 text-user-blue focus:ring-user-blue border-border rounded"
                  />
                  <label htmlFor="skip_holidays" className="ml-2 text-sm text-text-secondary">
                    Skip holidays
                  </label>
                </div>
              </div>
            </div>

            {/* Labels and Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-text-primary border-b border-border pb-2">
                Labels & Tags
              </h3>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Labels
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center px-2 py-1 text-xs bg-user-blue/10 text-user-blue rounded border border-user-blue/20"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="ml-1 text-user-blue hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                    className="flex-1 px-3 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    placeholder="Add label"
                  />
                  <button
                    type="button"
                    onClick={addLabel}
                    className="px-2 py-1 text-sm bg-user-blue text-white rounded hover:bg-blue-600"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 text-xs bg-user-green/10 text-user-green rounded border border-user-green/20"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-user-green hover:text-green-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-user-blue focus:border-transparent"
                    placeholder="Add tag"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-2 py-1 text-sm bg-user-green text-white rounded hover:bg-green-600"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.start_date}
                className="px-4 py-2 text-sm bg-user-blue text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Recurring Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecurringTaskForm;

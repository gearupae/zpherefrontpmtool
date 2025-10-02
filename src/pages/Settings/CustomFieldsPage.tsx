import React, { useState } from 'react';
import CustomFieldsManager from '../../components/CustomFields/CustomFieldsManager';
import {
  FolderIcon,
  RectangleStackIcon,
  UserGroupIcon,
  UsersIcon,
  FlagIcon,
  DocumentTextIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  ShoppingCartIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

type EntityType = 'projects' | 'tasks' | 'customers' | 'teams' | 'goals' | 'proposals' | 'invoices' | 'vendors' | 'purchase_orders';

const entityOptions: { id: EntityType; label: string; icon: React.ComponentType<any>; description: string; color: string }[] = [
  { id: 'projects', label: 'Projects', icon: FolderIcon, description: 'Add custom fields to project records', color: 'blue' },
  { id: 'tasks', label: 'Tasks', icon: RectangleStackIcon, description: 'Add custom fields to task records', color: 'green' },
  { id: 'customers', label: 'Customers', icon: UserGroupIcon, description: 'Add custom fields to customer profiles', color: 'purple' },
  { id: 'teams', label: 'Teams', icon: UsersIcon, description: 'Add custom fields to team records', color: 'yellow' },
  { id: 'goals', label: 'Goals', icon: FlagIcon, description: 'Add custom fields to goal tracking', color: 'red' },
  { id: 'proposals', label: 'Proposals', icon: DocumentTextIcon, description: 'Add custom fields to proposals', color: 'indigo' },
  { id: 'invoices', label: 'Invoices', icon: BanknotesIcon, description: 'Add custom fields to invoices', color: 'emerald' },
  { id: 'vendors', label: 'Vendors', icon: BuildingOffice2Icon, description: 'Add custom fields to vendor profiles', color: 'gray' },
  { id: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingCartIcon, description: 'Add custom fields to purchase orders', color: 'orange' },
];

const CustomFieldsPage: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('projects');

  return (
    <div className="space-y-4">
      {/* Entity Selector */}
      <div className="bg-white border border-gray-200 rounded-md p-3">
        <div className="mb-3">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Squares2X2Icon className="h-5 w-5 mr-2 text-blue-600" />
            Select Entity Type
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Choose which type of record you want to add custom fields to
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {entityOptions.map((option) => {
            const IconComponent = option.icon;
            const isSelected = selectedEntity === option.id;
            
            return (
              <button
                key={option.id}
                onClick={() => setSelectedEntity(option.id)}
                className={`relative p-2.5 rounded-md border transition-all duration-200 text-left hover:shadow-sm ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-1.5 rounded-md ${
                    isSelected ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </p>
                    <p className={`text-xs truncate ${
                      isSelected ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      Manage fields
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Entity Info */}
      <div className="bg-white border border-gray-200 rounded-md p-3">
        <div className="flex items-center space-x-3">
          {(() => {
            const selected = entityOptions.find(e => e.id === selectedEntity);
            if (!selected) return null;
            const IconComponent = selected.icon;
            return (
              <>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IconComponent className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    Custom Fields for {selected.label}
                  </h4>
                  <p className="text-sm text-gray-600">{selected.description}</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Custom Fields Manager */}
      <div className="bg-transparent border-0 rounded-none p-0">
        <CustomFieldsManager
          entityType={selectedEntity}
          mode="full"
          onFieldsChange={(fields) => {
            console.log('Custom fields updated:', fields);
            // Here you would typically save to backend
          }}
        />
      </div>
    </div>
  );
};

export default CustomFieldsPage;

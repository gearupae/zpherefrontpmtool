import React from 'react';
import { CustomerDetails } from '../../../types/proposalInsights';
import { UserIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '../../../hooks/redux';

interface Props {
  customer: CustomerDetails | null;
  isLoading?: boolean;
  error?: string | null;
}

const CustomerDetailsCard: React.FC<Props> = ({ customer, isLoading, error }) => {
  const { user } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Customer</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Customer</h3>
        <p className="text-sm text-gray-500">No customer information available.</p>
      </div>
    );
  }


  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <UserIcon className="h-5 w-5 mr-2" />
          Customer
        </h3>
        <div className="space-y-2">
          {customer.name && (
            <div>
              <p className="text-base font-semibold text-gray-900">{customer.name}</p>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center text-sm text-gray-700">
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              <a className="hover:underline" href={`mailto:${customer.email}`}>{customer.email}</a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center text-sm text-gray-700">
              <PhoneIcon className="h-4 w-4 mr-2" />
              <a className="hover:underline" href={`tel:${customer.phone}`}>{customer.phone}</a>
            </div>
          )}
          {customer.company && (
            <div className="flex items-center text-sm text-gray-700">
              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
              <span>{customer.company}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center text-sm text-gray-700">
              <MapPinIcon className="h-4 w-4 mr-2" />
              <span className="break-words">{customer.address}</span>
            </div>
          )}
          {customer.customerSince && (
            <div className="flex items-center text-sm text-gray-700">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <span>Customer since: {new Date(customer.customerSince).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsCard;
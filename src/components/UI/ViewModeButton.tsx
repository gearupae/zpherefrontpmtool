import React from 'react';

export interface ViewModeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ElementType;
  active?: boolean;
  variant?: 'default' | 'destructive';
}

const base = 'flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border';
const activeCls = 'bg-blue-50 border-blue-200 text-blue-700';
const inactiveCls = 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50';
const destructiveCls = 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100';

const ViewModeButton: React.FC<ViewModeButtonProps> = ({ label, icon: Icon, active = false, variant = 'default', className = '', ...rest }) => {
  let colorCls = active ? activeCls : inactiveCls;
  if (variant === 'destructive') {
    colorCls = destructiveCls;
  }
  const cls = `${base} ${colorCls} ${className}`.trim();
  return (
    <button className={cls} {...rest}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{label}</span>
    </button>
  );
};

export default ViewModeButton;

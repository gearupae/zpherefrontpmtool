import React from 'react';

interface VisibleToCustomerRadioProps {
  value: boolean;
  onChange: (val: boolean) => void;
  className?: string;
  helperText?: string;
  disabled?: boolean;
}

const VisibleToCustomerRadio: React.FC<VisibleToCustomerRadioProps> = ({
  value,
  onChange,
  className = '',
  helperText,
  disabled = false,
}) => {
  const options = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  return (
    <div className={className}>
      <div
        role="radiogroup"
        aria-label="Visible to customer"
        className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden"
      >
        {options.map((opt, idx) => {
          const isActive = value === opt.value;
          return (
            <label
              key={String(opt.value)}
              className={
                `px-3.5 text-sm cursor-pointer select-none transition-colors outline-none ` +
                `${isActive ? 'bg-user-blue text-white' : 'text-gray-700 hover:bg-gray-50'} ` +
                `${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
              }
            >
              <input
                type="radio"
                name="visible_to_customer"
                className="sr-only"
                checked={isActive}
                onChange={() => onChange(opt.value)}
                disabled={disabled}
                aria-checked={isActive}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
      {helperText && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default VisibleToCustomerRadio;

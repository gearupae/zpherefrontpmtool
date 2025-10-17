import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface DateRangeCalendarProps {
  initialFrom?: string | null;
  initialTo?: string | null;
  onChange: (from: string | null, to: string | null) => void;
  size?: 'xs' | 'sm' | 'md';
}

const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const sizeStyles = {
  xs: {
    headerPad: 'px-1 py-0.5',
    navPad: 'p-0.5',
    gridPad: 'px-0 pb-0',
    gap: 'gap-0',
    cell: 'w-4 h-4',
    cellText: 'text-[10px]',
    weekdayText: 'text-[9px]',
  },
  sm: {
    headerPad: 'px-1.5',
    navPad: 'p-0.5',
    gridPad: 'px-0.5 pb-0.5',
    gap: 'gap-0',
    cell: 'w-5 h-5',
    cellText: 'text-xs',
    weekdayText: 'text-[10px]',
  },
  md: {
    headerPad: 'px-2',
    navPad: 'p-1',
    gridPad: 'px-1 pb-1',
    gap: 'gap-0.5',
    cell: 'w-6 h-6',
    cellText: 'text-sm',
    weekdayText: 'text-[11px]',
  },
} as const;

const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({ initialFrom = null, initialTo = null, onChange, size = 'xs' }) => {
  const style = sizeStyles[size] || sizeStyles.xs;

  const base = initialFrom ? new Date(initialFrom) : new Date();
  const [month, setMonth] = useState<Date>(new Date(base.getFullYear(), base.getMonth(), 1));
  const [from, setFrom] = useState<string | null>(initialFrom);
  const [to, setTo] = useState<string | null>(initialTo);

  const monthName = month.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const handleSelect = (d: Date) => {
    const ymd = formatYMD(d);
    if (!from || (from && to)) {
      setFrom(ymd);
      setTo(null);
      onChange(ymd, null);
    } else {
      if (ymd < from) {
        setTo(from);
        setFrom(ymd);
        onChange(ymd, from);
      } else if (ymd === from) {
        setTo(ymd);
        onChange(ymd, ymd);
      } else {
        setTo(ymd);
        onChange(from, ymd);
      }
    }
  };

  const inRange = (ymd: string) => {
    if (from && to) return ymd >= from && ymd <= to;
    if (from && !to) return ymd === from;
    return false;
  };
  const isEdge = (ymd: string) => (from && ymd === from) || (to && ymd === to);

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  return (
    <div className="text-xs">
      <div className={`flex items-center justify-between ${style.headerPad}`}>
        <button type="button" className={`${style.navPad} hover:text-gray-700 text-gray-500`} onClick={prevMonth}>
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <div className="font-medium text-gray-800">{monthName}</div>
        <button type="button" className={`${style.navPad} hover:text-gray-700 text-gray-500`} onClick={nextMonth}>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
      <div className={`grid grid-cols-7 ${style.gap} ${style.gridPad}`}>
        {weekdays.map((w) => (
          <div key={w} className={`${size === 'xs' ? 'text-[9px]' : 'text-[10px]'} text-gray-500 text-center`}>{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`pad-${i}`} className={`${style.cell}`} />;
          const ymd = formatYMD(d);
          const selected = inRange(ymd);
          const edge = isEdge(ymd);
          const cls = [
            `${style.cell} flex items-center justify-center rounded cursor-pointer ${style.cellText}`,
            'hover:bg-gray-100',
            selected ? (edge ? 'bg-black text-white' : 'bg-gray-200 text-gray-900') : 'text-gray-800'
          ].join(' ');
          return (
            <button type="button" key={ymd} className={cls} onClick={() => handleSelect(d)} style={{ minHeight: '27px' }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateRangeCalendar;

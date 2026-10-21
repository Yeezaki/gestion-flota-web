import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  minWidth?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  minWidth = 'min-w-[680px]'
}) => {
  return (
    <div className="w-full overflow-x-auto scroll-touch rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`w-full ${minWidth}`}>
        {children}
      </div>
    </div>
  );
};
import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    navy: 'bg-navy-950 text-white border-navy-900',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variants[variant] || variants.default} ${sizes[size]}`}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
    case 'PAID':
    case 'APPROVED':
    case 'DELIVERED':
      return <Badge variant="success">{status.replace('_', ' ')}</Badge>;
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'AWAITING_DISBURSEMENT':
    case 'UPCOMING':
      return <Badge variant="warning">{status.replace('_', ' ')}</Badge>;
    case 'OVERDUE':
    case 'REJECTED':
    case 'WRITTEN_OFF':
      return <Badge variant="danger">{status.replace('_', ' ')}</Badge>;
    case 'PARTIALLY_PAID':
    case 'MORE_INFO_REQUIRED':
      return <Badge variant="info">{status.replace('_', ' ')}</Badge>;
    case 'FULLY_PAID':
    case 'CLOSED':
      return <Badge variant="navy">FULLY SETTLED</Badge>;
    default:
      return <Badge>{status ? status.replace('_', ' ') : 'N/A'}</Badge>;
  }
};


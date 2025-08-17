import React from 'react';
import { CalendarDays, Building2, Clock, BadgeInfo } from 'lucide-react';

const statusStyles = {
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  rejected: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  cancelled: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  default: 'bg-gray-50 text-gray-700 ring-1 ring-gray-200',
};

export default function ProfileActivity({ items = [] }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl p-6 bg-gradient-to-br from-white via-red-100 to-red-300 backdrop-blur-md ring-1 ring-black/10 border border-black/5 shadow-sm text-gray-600 flex items-center gap-2">
        <BadgeInfo className="w-5 h-5" />
        <span>No recent bookings.</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-white via-red-100 to-red-300 backdrop-blur-md ring-1 ring-black/10 border border-black/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <ul className="divide-y divide-gray-200/70">
        {items.map((b) => {
          const st = (b.status || 'default');
          const badge = statusStyles[st] || statusStyles.default;
          const start = b.startTime ? new Date(b.startTime) : null;
          const dateLabel = start ? start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-';
          const timeLabel = start ? start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <li key={b._id || b.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-10 h-10 rounded-lg bg-red-600/10 text-red-700 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {b.eventName || 'Booking'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${badge}`}>{st}</span>
                    {b.auditorium?.name && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-4 h-4" /> {b.auditorium.name}
                      </span>
                    )}
                    {start && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {dateLabel} • {timeLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

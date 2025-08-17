import React from 'react';
import { CalendarCheck2, Clock3, Ban, ListChecks } from 'lucide-react';

const cards = [
  { key: 'total', label: 'Total Bookings', icon: ListChecks, color: 'from-blue-500 to-blue-600' },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarCheck2, color: 'from-emerald-500 to-emerald-600' },
  { key: 'pending', label: 'Pending', icon: Clock3, color: 'from-amber-500 to-amber-600' },
  { key: 'cancelled', label: 'Cancelled', icon: Ban, color: 'from-rose-500 to-rose-600' },
];

export default function ProfileStats({ stats }) {
  const safeStats = stats || { total: 0, upcoming: 0, pending: 0, cancelled: 0 };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon, color }) => (
        <div key={key} className="rounded-xl p-4 bg-white/60 backdrop-blur-md ring-1 ring-black/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{safeStats[key] ?? 0}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
            {React.createElement(icon, { className: 'w-5 h-5 text-white' })}
          </div>
        </div>
      ))}
    </div>
  );
}

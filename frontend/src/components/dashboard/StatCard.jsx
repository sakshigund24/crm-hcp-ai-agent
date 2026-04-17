import React from 'react'
import { TrendingUp } from 'lucide-react'

export default function StatCard({ icon: Icon, label, value, subtext, color = 'green', loading }) {
  const colorMap = {
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'bg-green-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'bg-blue-100'  },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  ring: 'bg-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'bg-purple-100'},
  }
  const c = colorMap[color] || colorMap.green

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="shimmer h-10 w-10 rounded-xl mb-4" />
        <div className="shimmer h-4 w-20 rounded mb-2" />
        <div className="shimmer h-8 w-16 rounded" />
      </div>
    )
  }

  return (
    <div className="glass-card hover:shadow-md transition-shadow duration-200 animate-slide-up">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.ring}`}>
        <Icon size={20} className={c.icon} />
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800 leading-none mb-1">{value ?? '—'}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}

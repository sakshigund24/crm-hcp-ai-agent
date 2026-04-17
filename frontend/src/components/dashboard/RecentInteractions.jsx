import React from 'react'
import { format } from 'date-fns'
import { Calendar, Phone, Mail, Users, Monitor, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const typeIcon = {
  Visit:      { icon: Users,    cls: 'badge-green'  },
  Call:       { icon: Phone,    cls: 'badge-blue'   },
  Email:      { icon: Mail,     cls: 'badge-slate'  },
  Conference: { icon: Monitor,  cls: 'badge-amber'  },
  Webinar:    { icon: Monitor,  cls: 'badge-purple' },
}

const sentimentDot = {
  Positive: 'bg-green-400',
  Neutral:  'bg-amber-400',
  Negative: 'bg-red-400',
}

export default function RecentInteractions({ interactions = [], loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="glass-card">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Recent Interactions</h2>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="shimmer h-10 w-10 rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <div className="shimmer h-4 w-32 rounded mb-2" />
              <div className="shimmer h-3 w-48 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Interactions</h2>
        <button
          onClick={() => navigate('/history')}
          className="btn-ghost text-xs py-1.5 px-3"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {interactions.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400 text-sm">No interactions logged yet.</p>
          <button
            onClick={() => navigate('/log')}
            className="btn-primary mt-3 text-xs py-2"
          >
            Log your first interaction
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {interactions.map((item) => {
            const { icon: Icon, cls } = typeIcon[item.interaction_type] || typeIcon.Visit
            const dot = sentimentDot[item.sentiment] || 'bg-slate-300'

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/60 transition-colors duration-150 cursor-pointer group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm">
                    {item.hcp_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.hcp_name}</p>
                    <span className={`${cls} text-xs`}>
                      <Icon size={10} className="inline mr-1" />
                      {item.interaction_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {item.summary || item.topics_discussed || 'No summary'}
                  </p>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-xs text-slate-400">{item.sentiment || 'Neutral'}</span>
                  </div>
                  <span className="text-xs text-slate-300">
                    {item.created_at
                      ? format(new Date(item.created_at), 'dd MMM')
                      : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

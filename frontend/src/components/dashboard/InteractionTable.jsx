import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { format } from 'date-fns'
import { Trash2, Edit3, ChevronDown, ChevronUp, Calendar, MapPin } from 'lucide-react'
import { deleteInteraction } from '../../redux/slices/interactionsSlice'
import { addToast } from '../../redux/slices/uiSlice'

const SENTIMENT_STYLE = {
  Positive: 'badge-green',
  Neutral:  'badge-amber',
  Negative: 'badge-red',
}

const TYPE_STYLE = {
  Visit:      'badge-green',
  Call:       'badge-blue',
  Email:      'badge-slate',
  Conference: 'badge-amber',
  Webinar:    'badge-slate',
}

export default function InteractionTable({ interactions = [], loading }) {
  const dispatch         = useDispatch()
  const [expanded, setExpanded] = useState(null)

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete interaction with ${name}?`)) return
    const res = await dispatch(deleteInteraction(id))
    if (deleteInteraction.fulfilled.match(res)) {
      dispatch(addToast({ type: 'success', message: `Interaction deleted.` }))
    } else {
      dispatch(addToast({ type: 'error', message: 'Delete failed.' }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="glass rounded-xl p-4 flex gap-4">
            <div className="shimmer h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="shimmer h-4 w-40 rounded" />
              <div className="shimmer h-3 w-72 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center py-16 glass-card">
        <p className="text-slate-400 text-sm">No interactions match your filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {interactions.map((item) => {
        const isOpen = expanded === item.id
        return (
          <div
            key={item.id}
            className="glass rounded-xl overflow-hidden transition-all duration-200"
          >
            {/* Row header */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/40 transition-colors"
              onClick={() => setExpanded(isOpen ? null : item.id)}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold text-sm">
                  {item.hcp_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{item.hcp_name}</span>
                  {item.specialty && (
                    <span className="text-xs text-slate-400">· {item.specialty}</span>
                  )}
                  <span className={TYPE_STYLE[item.interaction_type] || 'badge-slate'}>
                    {item.interaction_type}
                  </span>
                  {item.sentiment && (
                    <span className={SENTIMENT_STYLE[item.sentiment] || 'badge-slate'}>
                      {item.sentiment}
                    </span>
                  )}
                  {item.log_source === 'chat' && (
                    <span className="badge bg-purple-100 text-purple-700">AI Logged</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {item.summary || item.topics_discussed || 'No summary available'}
                </p>
              </div>

              {/* Date + actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {item.interaction_date && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar size={11} />
                    {format(new Date(item.interaction_date), 'dd MMM yyyy')}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.hcp_name) }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
                {isOpen
                  ? <ChevronUp size={15} className="text-slate-400" />
                  : <ChevronDown size={15} className="text-slate-400" />
                }
              </div>
            </div>

            {/* Expanded details */}
            {isOpen && (
              <div className="border-t border-white/30 px-5 py-4 bg-white/20 animate-slide-up">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {item.hospital && (
                    <Detail label="Hospital" value={item.hospital} />
                  )}
                  {item.products_discussed && (
                    <Detail label="Products Discussed" value={item.products_discussed} />
                  )}
                  {item.topics_discussed && (
                    <Detail label="Topics" value={item.topics_discussed} />
                  )}
                  {item.materials_shared && (
                    <Detail label="Materials Shared" value={item.materials_shared} />
                  )}
                  {item.outcomes && (
                    <Detail label="Outcomes" value={item.outcomes} className="col-span-2" />
                  )}
                  {item.summary && (
                    <Detail label="Summary" value={item.summary} className="col-span-2" />
                  )}
                  {item.follow_up_required && (
                    <Detail
                      label="Follow-up"
                      value={`${item.follow_up_date ? format(new Date(item.follow_up_date), 'dd MMM yyyy') : 'TBD'} — ${item.follow_up_notes || 'No notes'}`}
                      highlight
                    />
                  )}
                  {item.ai_suggested_actions && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">AI Suggestions</p>
                      <ul className="space-y-1">
                        {JSON.parse(item.ai_suggested_actions || '[]').map((s, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">›</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Detail({ label, value, className = '', highlight }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${highlight ? 'text-amber-700 font-medium' : 'text-slate-700'}`}>
        {value}
      </p>
    </div>
  )
}

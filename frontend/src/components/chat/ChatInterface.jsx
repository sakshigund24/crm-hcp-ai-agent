import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Send, Sparkles, Trash2, Bot, User, CheckCircle, XCircle, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { sendChatMessage, clearMessages } from '../../redux/slices/chatSlice'
import { addToast } from '../../redux/slices/uiSlice'

const QUICK_PROMPTS = [
  "Met Dr. Sharma today, discussed Metformin for diabetes, positive sentiment, follow up next Monday",
  "Called Dr. Patel about Jardiance launch, she requested samples and a meeting next week",
  "Show me my last 5 interactions",
  "What should I do next with Dr. Mehta?",
  "Give me a weekly summary",
]

const TOOL_LABELS = {
  log_interaction_tool:         '🗂 Logged Interaction',
  edit_interaction_tool:        '✏️ Edited Interaction',
  get_interaction_history_tool: '📋 Fetched History',
  suggest_next_action_tool:     '💡 Next Action Advice',
  generate_summary_tool:        '📊 Generated Summary',
  search_hcp_tool:              '🔍 Searched HCPs',
  form_submission:              '📝 Form Submitted',
}

export default function ChatInterface() {
  const dispatch  = useDispatch()
  const messages  = useSelector((s) => s.chat.messages)
  const sessionId = useSelector((s) => s.chat.sessionId)
  const loading   = useSelector((s) => s.chat.loading)

  const [input, setInput] = useState('')
  const bottomRef         = useRef(null)
  const textareaRef       = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    const res = await dispatch(sendChatMessage({ message: msg, sessionId }))
    if (sendChatMessage.rejected.match(res)) {
      dispatch(addToast({ type: 'error', message: 'Agent failed to respond. Check your API key.' }))
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[640px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
            <Sparkles size={14} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-600 font-medium">Live</span>
          <button
            onClick={() => dispatch(clearMessages())}
            className="ml-2 btn-ghost py-1.5 px-2 text-xs text-slate-400"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-green-600" />
            </div>
            <div className="chat-bubble-ai px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <p className="text-xs text-slate-400 mb-2 font-medium">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setInput(p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors duration-150 text-left"
              >
                {p.length > 45 ? p.slice(0, 45) + '…' : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-2 glass rounded-2xl px-4 py-3">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your HCP interaction... (Shift+Enter for new line)"
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 resize-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            <Send size={14} color="white" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 text-center">
          AI will extract, structure, and log your interaction automatically.
        </p>
      </div>
    </div>
  )
}

// ── Individual message bubble ─────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-end gap-2 max-w-[80%]">
          <div className="chat-bubble-user px-4 py-3 text-sm">{msg.content}</div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <User size={13} color="white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-2 max-w-[90%]">
      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-green-600" />
      </div>
      <div className="space-y-2 flex-1">
        {/* Main bubble */}
        <div className={`chat-bubble-ai px-4 py-3 text-sm text-slate-700 ${
          msg.success === false ? 'border-red-200 bg-red-50/80' : ''
        }`}>
          <div className="flex items-start gap-2">
            {msg.success === false
              ? <XCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              : msg.toolUsed
                ? <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                : null
            }
            <p className="leading-relaxed">{msg.content}</p>
          </div>

          {msg.toolUsed && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
              <Wrench size={10} className="text-slate-400" />
              <span className="text-xs text-slate-400">
                {TOOL_LABELS[msg.toolUsed] || msg.toolUsed}
              </span>
            </div>
          )}
        </div>

        {/* AI suggestions */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="glass rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">💡 Suggested Follow-ups</p>
            <ul className="space-y-1">
              {msg.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">›</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FIX: Route data to correct card based on which tool was used */}
        {msg.toolUsed === 'log_interaction_tool' && msg.data && (
          <ExtractedDataCard data={msg.data} />
        )}

        {msg.toolUsed === 'generate_summary_tool' && msg.data && (
          <SummaryCard data={msg.data} />
        )}

        {msg.toolUsed === 'get_interaction_history_tool' && msg.data && (
          <HistoryCard data={msg.data} />
        )}

        {msg.toolUsed === 'suggest_next_action_tool' && msg.data && (
          <NextActionCard data={msg.data} />
        )}

        {msg.toolUsed === 'search_hcp_tool' && msg.data && (
          <SearchResultsCard data={msg.data} />
        )}

        <p className="text-xs text-slate-300 pl-1">
          {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
        </p>
      </div>
    </div>
  )
}

// ── Extracted interaction card (log tool) ────────────────────────────────────

function ExtractedDataCard({ data }) {
  if (!data) return null
  const fields = [
    { label: 'HCP',       value: data.hcp_name },
    { label: 'Type',      value: data.interaction_type },
    { label: 'Products',  value: data.products_discussed },
    { label: 'Sentiment', value: data.sentiment },
    { label: 'Follow-up', value: data.follow_up_required ? `Yes – ${data.follow_up_date || 'TBD'}` : 'No' },
  ].filter((f) => f.value)

  return (
    <div className="glass rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 mb-2">📋 Extracted & Logged</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex gap-1.5">
            <span className="text-xs text-slate-400 w-16 flex-shrink-0">{label}:</span>
            <span className="text-xs text-slate-700 font-medium truncate">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FIX: Summary card (generate_summary_tool) ────────────────────────────────

function SummaryCard({ data }) {
  if (!data) return null
  return (
    <div className="glass rounded-xl px-4 py-3 space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        📊 {data.period ? data.period.charAt(0).toUpperCase() + data.period.slice(1) : ''} Summary
        {data.generated_at && (
          <span className="ml-2 font-normal text-slate-400">
            {format(new Date(data.generated_at), 'dd MMM yyyy, HH:mm')}
          </span>
        )}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Interactions', value: data.total_interactions ?? '—' },
          { label: 'Unique HCPs',  value: data.unique_hcps ?? '—' },
          { label: 'Pending F/U',  value: data.pending_follow_ups ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
            <p className="text-base font-semibold text-slate-800">{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Sentiment */}
      {data.sentiment_breakdown && (
        <div className="flex gap-2">
          {Object.entries(data.sentiment_breakdown).map(([k, v]) => (
            <span
              key={k}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                k === 'Positive' ? 'bg-green-100 text-green-700'
                : k === 'Negative' ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-600'
              }`}
            >
              {k}: {v}
            </span>
          ))}
        </div>
      )}

      {/* Top products */}
      {data.top_products_discussed && data.top_products_discussed.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-400 mb-1">Top products</p>
          <div className="flex flex-wrap gap-1">
            {data.top_products_discussed.map((p) => (
              <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Executive summary */}
      {data.executive_summary && (
        <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
          {data.executive_summary}
        </p>
      )}
    </div>
  )
}

// ── History card (get_interaction_history_tool) ───────────────────────────────

function HistoryCard({ data }) {
  if (!data || !data.interactions) return null
  return (
    <div className="glass rounded-xl px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500">
        📋 {data.count} Interaction{data.count !== 1 ? 's' : ''} found
      </p>
      {data.narrative && (
        <p className="text-xs text-slate-600 leading-relaxed">{data.narrative}</p>
      )}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {data.interactions.map((item, i) => (
          <div key={item.id || i} className="flex items-start gap-2 text-xs border-t border-slate-100 pt-1.5">
            <span className="text-slate-400 w-16 flex-shrink-0">{item.interaction_date || '—'}</span>
            <span className="font-medium text-slate-700 w-28 flex-shrink-0 truncate">{item.hcp_name}</span>
            <span className="text-slate-500 truncate">{item.summary || item.interaction_type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Next action card (suggest_next_action_tool) ───────────────────────────────

function NextActionCard({ data }) {
  if (!data) return null
  const actions = data.priority_actions || []
  return (
    <div className="glass rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">💡 Action Plan — {data.hcp_name}</p>
        {data.engagement_score != null && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Engagement: {data.engagement_score}/10
          </span>
        )}
      </div>
      {data.overall_strategy && (
        <p className="text-xs text-slate-600 leading-relaxed">{data.overall_strategy}</p>
      )}
      <div className="space-y-1.5">
        {actions.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 ${
              a.priority === 'High'   ? 'bg-red-100 text-red-700'
              : a.priority === 'Medium' ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600'
            }`}>{a.priority}</span>
            <div>
              <p className="text-slate-700 font-medium">{a.action}</p>
              {a.timeline && <p className="text-slate-400 text-[10px]">{a.timeline}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Search results card (search_hcp_tool) ─────────────────────────────────────

function SearchResultsCard({ data }) {
  if (!data || !data.hcps) return null
  return (
    <div className="glass rounded-xl px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500">🔍 {data.count} HCP{data.count !== 1 ? 's' : ''} found</p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {data.hcps.map((hcp, i) => (
          <div key={i} className="flex items-center gap-2 text-xs border-t border-slate-100 pt-1.5">
            <span className="font-medium text-slate-700 w-32 flex-shrink-0 truncate">{hcp.hcp_name}</span>
            <span className="text-slate-400 w-24 flex-shrink-0 truncate">{hcp.specialty || '—'}</span>
            <span className="text-slate-400">{hcp.interaction_count} visit{hcp.interaction_count !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
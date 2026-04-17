import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  Users, Activity, AlertCircle, TrendingUp, Plus, Sparkles
} from 'lucide-react'
import StatCard from '../components/dashboard/StatCard'
import RecentInteractions from '../components/dashboard/RecentInteractions'
import { fetchStats, fetchInteractions } from '../redux/slices/interactionsSlice'

export default function DashboardPage() {
  const dispatch      = useDispatch()
  const navigate      = useNavigate()
  const { stats, statsLoading } = useSelector((s) => s.interactions)

  useEffect(() => {
    dispatch(fetchStats())
    dispatch(fetchInteractions({ per_page: 5 }))
  }, [dispatch])

  const recentInteractions = useSelector((s) => s.interactions.items.slice(0, 5))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/log')}
          className="btn-primary"
        >
          <Plus size={16} />
          Log Interaction
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Total Interactions"
          value={stats?.total_interactions}
          subtext="All time"
          color="green"
          loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={stats?.interactions_this_week}
          subtext="Last 7 days"
          color="blue"
          loading={statsLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Pending Follow-ups"
          value={stats?.pending_follow_ups}
          subtext="Action required"
          color="amber"
          loading={statsLoading}
        />
        <StatCard
          icon={Users}
          label="Unique HCPs"
          value={stats?.unique_hcps}
          subtext="In database"
          color="purple"
          loading={statsLoading}
        />
      </div>

      {/* Sentiment breakdown */}
      {stats?.sentiment_breakdown && (
        <div className="glass-card animate-slide-up">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Sentiment Overview</h2>
          <div className="flex gap-6">
            {Object.entries(stats.sentiment_breakdown).map(([sentiment, count]) => {
              const colors = {
                Positive: { bar: 'bg-green-400', text: 'text-green-700', bg: 'bg-green-50' },
                Neutral:  { bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50'  },
                Negative: { bar: 'bg-red-400',   text: 'text-red-700',   bg: 'bg-red-50'   },
              }
              const c = colors[sentiment] || colors.Neutral
              const total = Object.values(stats.sentiment_breakdown).reduce((a, b) => a + b, 0)
              const pct   = total ? Math.round((count / total) * 100) : 0

              return (
                <div key={sentiment} className={`flex-1 p-3 rounded-xl ${c.bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${c.text}`}>{sentiment}</span>
                    <span className={`text-lg font-bold ${c.text}`}>{count}</span>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${c.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${c.text} opacity-70`}>{pct}%</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent interactions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RecentInteractions interactions={recentInteractions} loading={statsLoading} />
        </div>

        {/* AI Tips panel */}
        <div className="glass-card flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-green-600" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">AI Insights</h2>
          </div>
          <div className="space-y-3">
            {[
              { tip: 'Log interactions within 24 hrs for accurate recall and better AI extraction.', icon: '⏱️' },
              { tip: 'Mention product names and outcomes clearly for smarter follow-up suggestions.', icon: '💊' },
              { tip: 'Use the chat interface for quick on-the-go logging right after a visit.', icon: '📱' },
              { tip: 'Ask the AI for a weekly summary to prep for your manager check-in.', icon: '📊' },
            ].map(({ tip, icon }, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/40">
                <span className="text-base flex-shrink-0">{icon}</span>
                <p className="text-xs text-slate-600 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

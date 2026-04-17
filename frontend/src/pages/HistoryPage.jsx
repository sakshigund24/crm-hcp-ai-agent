import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { fetchInteractions, setPage } from '../redux/slices/interactionsSlice'
import InteractionTable from '../components/dashboard/InteractionTable'

const INTERACTION_TYPES = ['All', 'Visit', 'Call', 'Email', 'Conference', 'Webinar']
const SENTIMENTS        = ['All', 'Positive', 'Neutral', 'Negative']

export default function HistoryPage() {
  const dispatch = useDispatch()
  const { items, total, page, perPage, loading } = useSelector((s) => s.interactions)

  const [search,    setSearch]    = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [sentFilter, setSentFilter] = useState('All')
  const [fuFilter,   setFuFilter]   = useState(false)

  const totalPages = Math.ceil(total / perPage) || 1

  const load = useCallback(() => {
    const params = {
      page,
      per_page: perPage,
      ...(search     ? { hcp_name: search } : {}),
      ...(typeFilter !== 'All' ? { interaction_type: typeFilter.toLowerCase() } : {}),
      ...(sentFilter !== 'All' ? { sentiment: sentFilter.toLowerCase() } : {}),
      ...(fuFilter ? { follow_up_required: true } : {}),
    }
    dispatch(fetchInteractions(params))
  }, [dispatch, page, perPage, search, typeFilter, sentFilter, fuFilter])

  useEffect(() => { load() }, [load])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setPage(1))
      load()
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handlePageChange = (newPage) => {
    dispatch(setPage(newPage))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Interaction History</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total} interaction{total !== 1 ? 's' : ''} logged
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="glass-card py-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by HCP name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Interaction type */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <div className="flex gap-1">
              {INTERACTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); dispatch(setPage(1)) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    typeFilter === t
                      ? 'bg-green-100 text-green-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sentiment */}
          <div className="flex gap-1">
            {SENTIMENTS.map((s) => (
              <button
                key={s}
                onClick={() => { setSentFilter(s); dispatch(setPage(1)) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  sentFilter === s
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Follow-up toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-amber-500 rounded"
              checked={fuFilter}
              onChange={(e) => { setFuFilter(e.target.checked); dispatch(setPage(1)) }}
            />
            <span className="text-xs font-medium text-slate-600">Follow-up pending</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <InteractionTable interactions={items} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between glass-card py-3">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-ghost py-1.5 px-2 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>

            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    p === page
                      ? 'bg-green-100 text-green-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
            })}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn-ghost py-1.5 px-2 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await api.get('/interactions', { params })
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch interactions')
    }
  }
)

export const logInteractionForm = createAsyncThunk(
  'interactions/logForm',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/interactions/form', payload)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to log interaction')
    }
  }
)

export const logInteractionChat = createAsyncThunk(
  'interactions/logChat',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/interactions/chat', payload)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Agent error')
    }
  }
)

export const updateInteraction = createAsyncThunk(
  'interactions/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/interactions/${id}`, data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Update failed')
    }
  }
)

export const deleteInteraction = createAsyncThunk(
  'interactions/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/interactions/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Delete failed')
    }
  }
)

export const fetchStats = createAsyncThunk(
  'interactions/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/stats')
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Stats fetch failed')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    perPage: 10,
    stats: null,
    loading: false,
    statsLoading: false,
    submitting: false,
    error: null,
    lastCreated: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
    clearLastCreated: (state) => { state.lastCreated = null },
    setPage: (state, action) => { state.page = action.payload },
  },
  extraReducers: (builder) => {
    builder
      // Fetch list
      .addCase(fetchInteractions.pending,  (s) => { s.loading = true; s.error = null })
      .addCase(fetchInteractions.fulfilled, (s, a) => {
        s.loading = false
        s.items   = a.payload.interactions
        s.total   = a.payload.total
        s.page    = a.payload.page
        s.perPage = a.payload.per_page
      })
      .addCase(fetchInteractions.rejected, (s, a) => { s.loading = false; s.error = a.payload })

      // Log via form
      .addCase(logInteractionForm.pending,  (s) => { s.submitting = true; s.error = null })
      .addCase(logInteractionForm.fulfilled, (s, a) => {
        s.submitting  = false
        s.lastCreated = a.payload.data
        if (a.payload.data) s.items.unshift(a.payload.data)
      })
      .addCase(logInteractionForm.rejected, (s, a) => { s.submitting = false; s.error = a.payload })

      // Log via chat
      .addCase(logInteractionChat.pending,  (s) => { s.submitting = true; s.error = null })
      .addCase(logInteractionChat.fulfilled, (s, a) => {
        s.submitting  = false
        s.lastCreated = a.payload.data
        if (a.payload.data) s.items.unshift(a.payload.data)
      })
      .addCase(logInteractionChat.rejected, (s, a) => { s.submitting = false; s.error = a.payload })

      // Update
      .addCase(updateInteraction.fulfilled, (s, a) => {
        const updated = a.payload.data
        if (updated) {
          const idx = s.items.findIndex((i) => i.id === updated.id)
          if (idx !== -1) s.items[idx] = updated
        }
      })

      // Delete
      .addCase(deleteInteraction.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload)
        s.total = Math.max(0, s.total - 1)
      })

      // Stats
      .addCase(fetchStats.pending,  (s) => { s.statsLoading = true })
      .addCase(fetchStats.fulfilled, (s, a) => { s.statsLoading = false; s.stats = a.payload })
      .addCase(fetchStats.rejected, (s) => { s.statsLoading = false })
  },
})

export const { clearError, clearLastCreated, setPage } = interactionsSlice.actions
export default interactionsSlice.reducer

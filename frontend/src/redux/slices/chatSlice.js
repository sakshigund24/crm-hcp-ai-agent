import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, sessionId }, { rejectWithValue }) => {
    try {
      const res = await api.post('/agent/chat', {
        message,
        session_id: sessionId || null,
      })
      return { userMessage: message, agentResponse: res.data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Agent error')
    }
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    lastExtracted: null,
    messages: [
      {
        id: 'welcome',
        role: 'ai',
        content: "Hi! I'm your HCP CRM assistant. You can tell me about your doctor interactions and I'll log them automatically. Try: \"Met Dr. Sharma today, discussed Metformin for diabetes management, he was positive and asked for samples. Follow up next Friday.\"",
        timestamp: new Date().toISOString(),
      },
    ],
    sessionId: `session_${Date.now()}`,
    loading: false,
    error: null,
  },
  reducers: {
    clearMessages: (state) => {
      state.messages = [state.messages[0]]
      state.sessionId = `session_${Date.now()}`
    },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.pending, (state, action) => {
        state.loading = true
        state.error   = null
        state.messages.push({
          id:        `user_${Date.now()}`,
          role:      'user',
          content:   action.meta.arg.message,
          timestamp: new Date().toISOString(),
        })
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false
        const { agentResponse } = action.payload
        const toolUsed = agentResponse.tool_used

        state.messages.push({
          id:          `ai_${Date.now()}`,
          role:        'ai',
          content:     agentResponse.message,
          toolUsed,
          data:        agentResponse.data,
          suggestions: agentResponse.ai_suggestions || [],
          success:     agentResponse.success,
          timestamp:   new Date().toISOString(),
        })

        // FIX: set lastExtracted for log tool (auto-fills the form)
        if (toolUsed === 'log_interaction_tool' && agentResponse.data) {
          state.lastExtracted = agentResponse.data
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false
        state.error   = action.payload
        state.messages.push({
          id:        `error_${Date.now()}`,
          role:      'ai',
          content:   `Something went wrong: ${action.payload}`,
          success:   false,
          timestamp: new Date().toISOString(),
        })
      })
  },
})

export const { clearMessages, clearError } = chatSlice.actions
export default chatSlice.reducer
import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeLogTab: 'form',   // 'form' | 'chat'
    sidebarOpen: true,
    toasts: [],
  },
  reducers: {
    setActiveLogTab: (state, action) => {
      state.activeLogTab = action.payload
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    addToast: (state, action) => {
      state.toasts.push({
        id:      Date.now(),
        type:    action.payload.type || 'info',
        message: action.payload.message,
      })
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { setActiveLogTab, toggleSidebar, addToast, removeToast } = uiSlice.actions
export default uiSlice.reducer

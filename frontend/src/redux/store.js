import { configureStore } from '@reduxjs/toolkit'
import interactionsReducer from './slices/interactionsSlice'
import chatReducer from './slices/chatSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    interactions: interactionsReducer,
    chat: chatReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore date objects in redux state
        ignoredPaths: ['interactions.items'],
      },
    }),
})

export default store

import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Toast from './Toast'
import { removeToast } from '../../redux/slices/uiSlice'

export default function Layout({ children }) {
  const dispatch = useDispatch()
  const toasts   = useSelector((s) => s.ui.toasts)

  // Auto-dismiss toasts after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      dispatch(removeToast(toasts[0].id))
    }, 4000)
    return () => clearTimeout(timer)
  }, [toasts, dispatch])

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            type={t.type}
            message={t.message}
            onClose={() => dispatch(removeToast(t.id))}
          />
        ))}
      </div>
    </div>
  )
}

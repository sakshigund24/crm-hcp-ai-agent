import React from 'react'
import { useSelector } from 'react-redux'
import InteractionForm from '../components/form/InteractionForm'
import ChatInterface from '../components/chat/ChatInterface'

export default function LogInteractionPage() {
  const lastExtracted = useSelector((s) => s.chat.lastExtracted)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Log HCP Interaction</h1>
        <p className="text-sm text-slate-500 mt-1">
          Describe your interaction to the AI on the right — fields will auto-fill in the form as it extracts details.
        </p>
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* LEFT — Structured Form */}
        <div className="glass-card animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Structured Form</h2>
            {lastExtracted && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold animate-pulse">
                ✦ Auto-filled
              </span>
            )}
          </div>
          <InteractionForm extractedData={lastExtracted} />
        </div>

        {/* RIGHT — AI Chat */}
        <div className="glass-card animate-fade-in sticky top-6">
          <ChatInterface />
        </div>

      </div>
    </div>
  )
}
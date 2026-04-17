import React from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const config = {
  success: { icon: CheckCircle, bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800', icon_color: 'text-green-500' },
  error:   { icon: XCircle,     bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800',   icon_color: 'text-red-500'   },
  info:    { icon: Info,        bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',  icon_color: 'text-blue-500'  },
}

export default function Toast({ type = 'info', message, onClose }) {
  const { icon: Icon, bg, border, text, icon_color } = config[type] || config.info

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border glass animate-slide-up max-w-sm ${bg} ${border}`}>
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${icon_color}`} />
      <p className={`text-sm font-medium flex-1 ${text}`}>{message}</p>
      <button onClick={onClose} className={`flex-shrink-0 opacity-50 hover:opacity-100 ${text}`}>
        <X size={14} />
      </button>
    </div>
  )
}

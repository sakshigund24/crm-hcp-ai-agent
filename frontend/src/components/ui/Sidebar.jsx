import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardPen,
  History,
  Stethoscope,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/log',       icon: ClipboardPen,    label: 'Log Interaction' },
  { to: '/history',   icon: History,         label: 'History' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="h-screen w-64 flex-shrink-0 glass-strong border-r border-white/40 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            <Stethoscope size={18} color="white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 leading-tight">HCP CRM</p>
            <p className="text-xs text-slate-400 leading-tight">Life Sciences</p>
          </div>
        </div>
      </div>

      {/* AI Badge */}
      <div className="mx-4 mt-4 px-3 py-2 rounded-xl flex items-center gap-2"
           style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <Sparkles size={14} className="text-green-600" />
        <span className="text-xs font-semibold text-green-700">LangGraph AI Active</span>
        <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-green-700 bg-green-50 shadow-sm border border-green-100'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-green-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
            FR
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Field Rep</p>
            <p className="text-xs text-slate-400">Life Sciences</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import LogInteractionPage from './pages/LogInteractionPage'
import HistoryPage from './pages/HistoryPage'
import Layout from './components/ui/Layout'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<DashboardPage />} />
        <Route path="/log"         element={<LogInteractionPage />} />
        <Route path="/history"     element={<HistoryPage />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

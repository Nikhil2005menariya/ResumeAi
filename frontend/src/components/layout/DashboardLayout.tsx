import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AgentStatus } from './AgentStatus'

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Resum.Ai</h1>
          </div>
          <div className="flex items-center gap-4">
            <AgentStatus />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

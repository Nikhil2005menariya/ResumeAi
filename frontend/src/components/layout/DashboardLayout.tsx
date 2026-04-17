import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AgentStatus } from './AgentStatus'
import { Brand } from '@/components/Brand'

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="mx-4 mt-4 flex h-20 items-center justify-between rounded-3xl border border-white/60 bg-white/75 px-6 backdrop-blur-xl">
          <Brand size="sm" />
          <div className="flex items-center gap-3">
            <AgentStatus />
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 pb-4 pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

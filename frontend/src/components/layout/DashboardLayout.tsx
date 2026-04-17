import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Brand } from '@/components/Brand'

export function DashboardLayout() {
  return (
    <div className="dashboard-shell flex h-screen overflow-hidden bg-[#fafafa]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col p-4 pt-3">
        <header className="dashboard-topbar flex h-16 items-center justify-between rounded-2xl px-4 sm:px-5">
          <div className="flex items-center gap-3 lg:hidden">
            <Brand size="sm" />
          </div>
          <div className="hidden lg:block">
            <p className="dashboard-kicker">Workspace</p>
          </div>
        </header>

        <main className="mt-4 flex-1 overflow-auto rounded-2xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

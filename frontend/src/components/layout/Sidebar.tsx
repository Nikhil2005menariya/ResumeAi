import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  User,
  FolderKanban,
  FileText,
  Search,
  LogOut,
  Wand2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { Brand } from '@/components/Brand'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/app/profile', icon: User },
  { name: 'Projects', href: '/app/projects', icon: FolderKanban },
  { name: 'My Resumes', href: '/app/resumes', icon: FileText },
  { name: 'Search Jobs', href: '/app/jobs', icon: Search },
]

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuthStore()

  return (
    <aside className="flex h-full w-72 flex-col p-4">
      <div className="glass-card flex h-full flex-col rounded-3xl">
        <div className="flex h-20 items-center gap-3 px-6 border-b border-slate-100">
          <Brand size="sm" />
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-[0_12px_26px_-16px_hsl(var(--primary))]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4">
          <Link
            to="/app/create-resume"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all duration-200 hover:brightness-105"
          >
            <Wand2 className="h-4 w-4" />
            Generate Resume
          </Link>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              RA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-700">Signed in</p>
              <p className="text-xs text-slate-500">Manage your account</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

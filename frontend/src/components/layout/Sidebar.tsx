import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  User,
  FolderKanban,
  FileText,
  Search,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/profile', icon: User },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'My Resumes', href: '/resumes', icon: FileText },
  { name: 'Search Jobs', href: '/jobs', icon: Search },
]

export function Sidebar() {
  const location = useLocation()
  const { logout } = useAuthStore()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">Resume AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Create Resume CTA */}
      <div className="p-4">
        <Link
          to="/create-resume"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:opacity-90 transition-opacity"
        >
          <Sparkles className="h-4 w-4" />
          Generate Resume
        </Link>
      </div>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Settings</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

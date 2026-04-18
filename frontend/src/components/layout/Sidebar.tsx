import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Briefcase,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'My Profile', href: '/app/profile', icon: User },
  { name: 'Projects', href: '/app/projects', icon: FolderKanban },
  { name: 'My Resumes', href: '/app/resumes', icon: FileText },
  { name: 'Search Jobs', href: '/app/jobs', icon: Briefcase },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((part: string) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'RA'

  return (
    <aside className="hidden h-screen w-[290px] shrink-0 px-4 lg:flex lg:items-center">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28 }}
        className="dashboard-sidebar relative flex h-[90vh] w-full flex-col overflow-hidden rounded-2xl"
      >
        <div className="dashboard-sidebar-glow" />

        <div className="relative z-10 px-5 pb-2 pt-6">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]"
          >
            Resume Builder Suite
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-1 text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] text-[#111827]"
          >
            Resum.Ai
          </motion.h2>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '72px' }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="mt-2 h-[2px] rounded-full bg-gradient-to-r from-[#0a72ef] via-[#8b5cf6] to-[#de1d8d]"
          />
        </div>

        <nav className="relative z-10 flex-1 space-y-1.5 px-3 py-3">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.04 * index }}
              >
                <Link
                  to={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-200',
                    isActive
                      ? 'bg-[#0f172a] text-white shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_10px_22px_-18px_rgba(15,23,42,0.35)]'
                      : 'text-[#334155] hover:bg-white/90 hover:text-[#0f172a]'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        <div className="relative z-10 p-3">
          <Link
            to="/app/create-resume"
            className="flex items-center justify-between rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(15,23,42,0.08),0_10px_20px_-16px_rgba(15,23,42,0.4)] transition-colors hover:bg-[#020617]"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Resume
            </span>
            <ArrowRight className="h-4 w-4 text-slate-200" />
          </Link>
        </div>

        <div className="relative z-10 border-t border-[#e2e8f0] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 shadow-[0_0_0_1px_rgba(15,23,42,0.05)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2e8f0] text-xs font-semibold text-[#0f172a]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0f172a]">{user?.full_name || 'Signed in'}</p>
              <p className="truncate text-xs text-[#64748b]">{user?.email || 'Resume workspace'}</p>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="rounded-lg p-2 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </aside>
  )
}

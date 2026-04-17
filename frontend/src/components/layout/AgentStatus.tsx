import { useAgentStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle, Brain } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  idle: { label: 'Ready', color: 'bg-slate-100 text-slate-600 border border-slate-200', icon: Brain },
  planning: { label: 'Planning', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Loader2 },
  retrieving_data: { label: 'Retrieving', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Loader2 },
  analyzing: { label: 'Analyzing', color: 'bg-violet-50 text-violet-700 border border-violet-200', icon: Loader2 },
  generating: { label: 'Generating', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200', icon: Loader2 },
  compiling: { label: 'Compiling', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: Loader2 },
  searching: { label: 'Searching', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200', icon: Loader2 },
  refining: { label: 'Refining', color: 'bg-violet-50 text-violet-700 border border-violet-200', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
}

export function AgentStatus() {
  const { status } = useAgentStore()
  const config = statusConfig[status.status] || statusConfig.idle
  const Icon = config.icon
  const isLoading = ['planning', 'retrieving_data', 'analyzing', 'generating', 'compiling', 'searching', 'refining'].includes(status.status)

  return (
    <div className={cn('agent-status', config.color)}>
      <Icon className={cn('h-4 w-4', isLoading && 'animate-spin')} />
      <span>{config.label}</span>
      {status.message && (
        <span className="text-xs opacity-75">- {status.message}</span>
      )}
    </div>
  )
}

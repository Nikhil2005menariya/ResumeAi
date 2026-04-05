import { useAgentStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle, Brain } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  idle: { label: 'Ready', color: 'bg-gray-100 text-gray-600', icon: Brain },
  planning: { label: 'Planning', color: 'bg-blue-100 text-blue-600', icon: Loader2 },
  retrieving_data: { label: 'Retrieving Data', color: 'bg-blue-100 text-blue-600', icon: Loader2 },
  analyzing: { label: 'Analyzing', color: 'bg-purple-100 text-purple-600', icon: Loader2 },
  generating: { label: 'Generating', color: 'bg-indigo-100 text-indigo-600', icon: Loader2 },
  compiling: { label: 'Compiling PDF', color: 'bg-orange-100 text-orange-600', icon: Loader2 },
  searching: { label: 'Searching Jobs', color: 'bg-cyan-100 text-cyan-600', icon: Loader2 },
  refining: { label: 'Refining', color: 'bg-violet-100 text-violet-600', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  error: { label: 'Error', color: 'bg-red-100 text-red-600', icon: XCircle },
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

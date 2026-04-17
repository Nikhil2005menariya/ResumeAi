import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Search, Loader2, ExternalLink, Sparkles, MapPin, Building, Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { jobsApi } from '@/lib/api'
import { useAgentStore } from '@/lib/store'
import { formatRelativeTime, truncate } from '@/lib/utils'

interface Job {
  title: string
  company: string
  location?: string
  description?: string
  url: string
  relevance_score?: number
  job_type?: string
  posted_date?: string
}

export function JobsPage() {
  const queryClient = useQueryClient()
  const { setStatus } = useAgentStore()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: savedJobs, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => jobsApi.getSaved().then(res => res.data),
  })

  const searchMutation = useMutation({
    mutationFn: (query: string) => jobsApi.search({ query }),
    onMutate: () => {
      setStatus({ status: 'searching', message: 'Searching for jobs...', progress: 30 })
    },
    onSuccess: (response) => {
      setStatus({ status: 'completed', message: `Found ${response.data.jobs.length} jobs`, progress: 100 })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      toast.success(`Found ${response.data.jobs.length} matching jobs!`)
    },
    onError: (error: any) => {
      setStatus({ status: 'error', message: 'Search failed', progress: 0 })
      toast.error(error.response?.data?.detail || 'Search failed')
    },
  })

  const generateResumeMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.generateResumeForJob(jobId),
    onMutate: () => {
      setStatus({ status: 'generating', message: 'Creating tailored resume...', progress: 50 })
    },
    onSuccess: () => {
      setStatus({ status: 'completed', message: 'Resume generated!', progress: 100 })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      toast.success('Resume generated for this job!')
    },
    onError: (error: any) => {
      setStatus({ status: 'error', message: 'Generation failed', progress: 0 })
      toast.error(error.response?.data?.detail || 'Failed to generate resume')
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }
    searchMutation.mutate(searchQuery)
  }

  const searchResults = searchMutation.data?.data?.jobs || []

  return (
    <div className="page-wrap space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Search Jobs</h1>
        <p className="mt-1 text-slate-600">
          Find jobs matching your skills and generate tailored resumes
        </p>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., React developer, Python intern, Full stack engineer..."
                className="pl-10"
                disabled={searchMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={searchMutation.isPending} className="gap-2">
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search Jobs
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Results ({searchResults.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {searchResults.map((job: Job, idx: number) => (
              <JobCard
                key={idx}
                job={job}
                onGenerateResume={() => {}}
                isGenerating={false}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Searches</h2>
        {isLoadingSaved ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : savedJobs && savedJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {savedJobs.map((job: any) => (
              <JobCard
                key={job.id}
                job={job}
                onGenerateResume={() => generateResumeMutation.mutate(job.id)}
                isGenerating={generateResumeMutation.isPending}
                hasResume={job.has_generated_resume}
                savedAt={job.saved_at}
              />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No saved jobs yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Search for jobs above to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface JobCardProps {
  job: Job | any
  onGenerateResume: () => void
  isGenerating: boolean
  hasResume?: boolean
  savedAt?: string
}

function JobCard({ job, onGenerateResume, isGenerating, hasResume, savedAt }: JobCardProps) {
  return (
    <Card className="glass-card transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{job.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Building className="h-3 w-3" />
              {job.company}
            </CardDescription>
          </div>
          {job.relevance_score && (
            <div className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              <Star className="h-3 w-3" />
              {Math.round(job.relevance_score)}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.location && (
            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
              <MapPin className="h-3 w-3" />
              {job.location}
            </span>
          )}
          {job.job_type && (
            <span className="bg-muted px-2 py-1 rounded">{job.job_type}</span>
          )}
          {(job.posted_date || savedAt) && (
            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
              <Clock className="h-3 w-3" />
              {job.posted_date || (savedAt ? formatRelativeTime(savedAt) : '')}
            </span>
          )}
        </div>
        
        {job.description && (
          <p className="text-sm text-muted-foreground">
            {truncate(job.description, 150)}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          {job.url && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Apply
              </a>
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={onGenerateResume}
            disabled={isGenerating || hasResume}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {hasResume ? 'Resume Created' : 'Generate Resume'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { jobsApi, waitForTaskCompletion } from '@/lib/api'
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

type SearchFeedback = {
  status: 'idle' | 'searching' | 'completed' | 'error'
  message: string
}

export function JobsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFeedback, setSearchFeedback] = useState<SearchFeedback>({
    status: 'idle',
    message: 'Search for relevant openings and generate tailored resumes instantly.',
  })

  const { data: savedJobs, isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => jobsApi.getSaved().then((res: any) => res.data),
  })

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const queuedTask = await jobsApi.search({ query })
      return waitForTaskCompletion<{
        status: string
        status_message: string
        jobs: Job[]
      }>(queuedTask.data.job_id)
    },
    onMutate: () => {
      setSearchFeedback({
        status: 'searching',
        message: 'Finding the best-suited jobs for you...',
      })
    },
    onSuccess: (data) => {
      const status = data.status || 'completed'
      const statusMessage = data.status_message || `Found ${data.jobs.length} jobs`
      setSearchFeedback({
        status: status === 'error' ? 'error' : 'completed',
        message: statusMessage,
      })
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      toast.success(`Found ${data.jobs.length} matching jobs!`)
    },
    onError: (error: any) => {
      const message = error?.message || error.response?.data?.detail || 'Search failed'
      setSearchFeedback({
        status: 'error',
        message,
      })
      toast.error(message)
    },
  })

  const generateResumeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const queuedTask = await jobsApi.generateResumeForJob(jobId)
      return waitForTaskCompletion<{
        status: string
        status_message: string
      }>(queuedTask.data.job_id)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] })
      toast.success(data?.status_message || 'Resume generated for this job!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to generate resume')
    },
  })

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query')
      return
    }
    searchMutation.mutate(searchQuery)
  }

  const searchResults = searchMutation.data?.jobs || []

  return (
    <div className="page-wrap space-y-5">
      <Card className="jobs-hero-card">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-[#171717]">Search Jobs</h1>
              <p className="mt-1 text-[#666666]">Find relevant opportunities and generate premium role-specific resumes.</p>
            </div>
            <span className="jobs-kicker">Job Discovery</span>
          </div>

          <form onSubmit={handleSearch} className="jobs-search-bar">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#64748b]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., React developer, Python intern, Full stack engineer..."
                className="h-11 border-[#dbe3ef] bg-white pl-10"
                disabled={searchMutation.isPending}
              />
            </div>
            <Button type="submit" disabled={searchMutation.isPending} className="dashboard-btn-dark h-11 gap-2 rounded-md px-4">
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Jobs
            </Button>
          </form>

          <div className={`jobs-feedback jobs-feedback--${searchFeedback.status}`}>
            {searchFeedback.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            <span>{searchFeedback.message}</span>
          </div>
        </CardContent>
      </Card>

      {searchMutation.isPending ? (
        <Card className="jobs-loader-card">
          <CardContent className="p-8">
            <JobSearchLoader />
            <p className="jobs-loader-text">Finding the best-suited jobs for you...</p>
          </CardContent>
        </Card>
      ) : null}

      {searchResults.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#171717]">Search Results ({searchResults.length})</h2>
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
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#171717]">Recent Searches</h2>
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
          <Card className="dashboard-card-clean">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No saved jobs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Search for jobs above to get started</p>
            </CardContent>
          </Card>
        )}
      </section>
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
    <Card className="dashboard-card-clean transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{job.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Building className="h-3 w-3" />
              {job.company}
            </CardDescription>
          </div>
          {job.relevance_score ? (
            <div className="dashboard-pill inline-flex items-center gap-1">
              <Star className="h-3 w-3" />
              {Math.round(job.relevance_score)}%
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {job.location ? (
            <span className="rounded bg-muted px-2 py-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            </span>
          ) : null}
          {job.job_type ? <span className="rounded bg-muted px-2 py-1">{job.job_type}</span> : null}
          {job.posted_date || savedAt ? (
            <span className="rounded bg-muted px-2 py-1">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {job.posted_date || (savedAt ? formatRelativeTime(savedAt) : '')}
              </span>
            </span>
          ) : null}
        </div>

        {job.description ? <p className="text-sm text-muted-foreground">{truncate(job.description, 150)}</p> : null}

        <div className="flex gap-2 pt-2">
          {job.url ? (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Apply
              </a>
            </Button>
          ) : null}
          <Button
            size="sm"
            className="dashboard-btn-dark flex-1 gap-1"
            onClick={onGenerateResume}
            disabled={isGenerating || hasResume}
          >
            {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            {hasResume ? 'Resume Created' : 'Generate Resume'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function JobSearchLoader() {
  return (
    <div className="job-loader-wrap">
      <div className="job-loader">
        <span>
          <span />
          <span />
          <span />
          <span />
        </span>
        <div className="job-base">
          <span />
          <div className="job-face" />
        </div>
      </div>
      <div className="job-longfazers">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

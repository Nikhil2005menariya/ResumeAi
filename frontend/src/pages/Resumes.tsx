import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Download, Edit2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumesApi } from '@/lib/api'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export function ResumesPage() {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null)

  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumesApi.list().then((res: any) => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resumesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      toast.success('Resume deleted!')
      setPendingDelete(null)
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail || 'Failed to delete resume'),
    onSettled: () => setDeletingResumeId(null),
  })

  const resumeLimitReached = (resumes?.length ?? 0) >= 5

  const handleDownloadPdf = async (resumeId: string, title: string) => {
    try {
      const response = await resumesApi.getPdf(resumeId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded!')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to download PDF')
    }
  }

  const handleDownloadLatex = async (resumeId: string, title: string) => {
    try {
      const response = await resumesApi.getLatex(resumeId)
      const blob = new Blob([response.data], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.tex`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('LaTeX file downloaded!')
    } catch (error) {
      toast.error('Failed to download LaTeX')
    }
  }

  const handleDeleteResume = (resumeId: string, title: string) => {
    setPendingDelete({ id: resumeId, title })
  }

  const handleConfirmDelete = () => {
    if (!pendingDelete) return
    setDeletingResumeId(pendingDelete.id)
    deleteMutation.mutate(pendingDelete.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="page-wrap space-y-6 pr-2">
      {pendingDelete ? (
        <div className="resume-warning-overlay">
          <div className="resume-warning-modal animate-fade-in">
            <p className="dashboard-kicker">Delete Resume</p>
            <h3 className="resume-warning-title">Delete &ldquo;{pendingDelete.title}&rdquo;?</h3>
            <p className="resume-warning-copy">
              This action cannot be undone. You can generate a new resume after deleting old ones.
            </p>
            <div className="resume-warning-actions">
              <Button
                variant="outline"
                onClick={() => setPendingDelete(null)}
                disabled={deleteMutation.isPending}
                className="dashboard-btn-light"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="resume-warning-delete-btn"
              >
                {deleteMutation.isPending && deletingResumeId === pendingDelete.id ? 'Deleting…' : 'Delete Resume'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Resumes</h1>
          <p className="mt-1 text-slate-600">
            View and download your AI-generated resumes
          </p>
        </div>
        {resumeLimitReached ? (
          <Button
            className="dashboard-btn-dark h-10 gap-2 rounded-md px-4"
            disabled
            title="Resume limit reached. Delete an older resume to generate a new one."
          >
            <Plus className="h-4 w-4" />
            Limit Reached (5/5)
          </Button>
        ) : (
          <Link to="/app/create-resume" className="shrink-0">
            <Button className="dashboard-btn-dark h-10 gap-2 rounded-md px-4">
              <Plus className="h-4 w-4" />
              Generate New Resume
            </Button>
          </Link>
        )}
      </div>

      {resumes && resumes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume: any) => (
            <Card key={resume.id} className="glass-card transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{resume.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {formatRelativeTime(resume.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  {resume.ats_score && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      {resume.ats_score}% ATS
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {resume.job_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {resume.job_description.slice(0, 100)}...
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Version {resume.version}</span>
                  <span>{formatDate(resume.created_at)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleDownloadPdf(resume.id, resume.title)}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleDownloadLatex(resume.id, resume.title)}
                  >
                    <FileText className="h-3 w-3" />
                    LaTeX
                  </Button>
                  <Link to={`/app/create-resume?edit=${resume.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </Link>
                  <button
                    type="button"
                    className="resume-delete-button"
                    onClick={() => handleDeleteResume(resume.id, resume.title)}
                    disabled={deleteMutation.isPending}
                    title="Delete resume"
                    aria-label={`Delete ${resume.title}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 14" className="resume-delete-icon resume-delete-top">
                      <path
                        fill="currentColor"
                        d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3254 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z"
                      />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 57" className="resume-delete-icon">
                      <path
                        fill="currentColor"
                        d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -14.787L48.1768 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z"
                      />
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold">No resumes yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Generate your first AI-powered resume
            </p>
            <Link to="/app/create-resume">
              <Button className="dashboard-btn-dark mt-4 h-10 gap-2 rounded-md px-4">
                <Plus className="h-4 w-4" />
                Generate Resume
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

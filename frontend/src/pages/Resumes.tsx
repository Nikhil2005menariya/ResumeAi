import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, Download, Trash2, Edit2, Loader2, Plus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumesApi } from '@/lib/api'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export function ResumesPage() {
  const { data: resumes, isLoading } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumesApi.list().then(res => res.data),
  })

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
    } catch (error) {
      toast.error('Failed to download PDF')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Resumes</h1>
          <p className="text-muted-foreground mt-1">
            View and download your AI-generated resumes
          </p>
        </div>
        <Link to="/app/create-resume">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Generate New Resume
          </Button>
        </Link>
      </div>

      {/* Resumes Grid */}
      {resumes && resumes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume: any) => (
            <Card key={resume.id} className="hover:shadow-md transition-shadow">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold">No resumes yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Generate your first AI-powered resume
            </p>
            <Link to="/app/create-resume">
              <Button className="mt-4 gap-2">
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

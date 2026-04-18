import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { NewtonLoader } from '@/components/ui/newton-loader'
import { resumesApi, waitForTaskCompletion } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ResumeChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface ResumeDetailPayload {
  id: string
  title: string
  job_description?: string
  custom_instructions?: string
  has_pdf?: boolean
  ats_score?: number
  assistant_response?: string
  chat_history?: ResumeChatMessage[]
}

const GENERIC_ERROR_MESSAGE = 'An error occurred. Please try again.'

function PDFPreview({
  resumeId,
  onRecompile,
  autoRecompileTrigger = 0,
}: {
  resumeId: string
  onRecompile?: () => void
  autoRecompileTrigger?: number
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recompiling, setRecompiling] = useState(false)

  const loadPDF = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await resumesApi.getPreview(resumeId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch {
      setError(GENERIC_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  const runRecompile = async (showSuccessToast: boolean) => {
    try {
      setRecompiling(true)
      setError(null)
      const queuedTask = await resumesApi.recompile(resumeId)
      await waitForTaskCompletion(queuedTask.data.job_id)
      await loadPDF()
      if (onRecompile) onRecompile()
      if (showSuccessToast) toast.success('Preview recompiled')
    } catch (error: any) {
      const message = error?.message || GENERIC_ERROR_MESSAGE
      setError(message)
      toast.error(message)
    } finally {
      setRecompiling(false)
    }
  }

  const handleRecompile = async () => {
    await runRecompile(true)
  }

  useEffect(() => {
    loadPDF()
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [resumeId])

  useEffect(() => {
    if (autoRecompileTrigger <= 0) return
    runRecompile(false)
  }, [autoRecompileTrigger])

  return (
    <div className="preview-frame flex h-full flex-col">
      <div className="preview-toolbar">
        <p className="preview-toolbar-label">Live Preview</p>
        <Button
          onClick={handleRecompile}
          size="sm"
          variant="ghost"
          disabled={recompiling}
          className="preview-recompile-btn"
        >
          {recompiling ? <NewtonLoader size="sm" /> : <RefreshCw className="h-4 w-4" />}
          <span>{recompiling ? 'Recompiling' : 'Recompile'}</span>
        </Button>
      </div>

      <div className="preview-canvas flex-1">
        {loading || recompiling ? (
          <div className="preview-state">
            <NewtonLoader size="lg" />
            <p className="preview-state-title">{recompiling ? 'Recompiling PDF' : 'Compiling PDF'}</p>
            <p className="preview-state-subtitle">Running LaTeX build for final preview output.</p>
          </div>
        ) : error ? (
          <div className="preview-state">
            <FileText className="h-10 w-10 text-red-400" />
            <p className="preview-state-title text-red-600">{error}</p>
            <Button onClick={handleRecompile} size="sm" variant="outline" className="mt-2">
              Retry Compilation
            </Button>
          </div>
        ) : !pdfUrl ? (
          <div className="preview-state">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="preview-state-title">No PDF available</p>
          </div>
        ) : (
          <iframe src={pdfUrl} className="h-full w-full rounded-b-xl border-0" title="Resume Preview" />
        )}
      </div>
    </div>
  )
}

export function CreateResumePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editResumeId = searchParams.get('edit')

  const [jobDescription, setJobDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [hasPdf, setHasPdf] = useState(false)
  const [isLoadingResume, setIsLoadingResume] = useState(false)
  const [autoRecompileTrigger, setAutoRecompileTrigger] = useState(0)
  const [pageStatus, setPageStatus] = useState<{
    tone: 'idle' | 'working' | 'success' | 'error'
    message: string
  }>({
    tone: 'idle',
    message: 'Ready to generate a tailored resume.',
  })

  useEffect(() => {
    if (editResumeId) loadExistingResume(editResumeId)
  }, [editResumeId])

  const loadExistingResume = async (id: string) => {
    try {
      setIsLoadingResume(true)
      setPageStatus({
        tone: 'working',
        message: 'Loading resume and preparing preview...',
      })
      const response = await resumesApi.get(id)
      const resume = response.data as ResumeDetailPayload

      setResumeId(id)
      if (resume.job_description) setJobDescription(resume.job_description)
      if (resume.custom_instructions) setInstructions(resume.custom_instructions)
      setHasPdf(resume.has_pdf || true)
      const loadedMessages =
        resume.chat_history && resume.chat_history.length > 0
          ? resume.chat_history
              .filter((msg) => !!msg?.content && !!msg?.role)
              .map((msg) => ({ role: msg.role, content: msg.content }))
          : [
              {
                role: 'assistant' as const,
                content:
                  `Loaded resume: ${resume.title}\n\n` +
                  `The preview on the right is live.\n` +
                  `You can ask for edits below and recompile anytime.`,
              },
            ]
      setMessages(loadedMessages)
      setPageStatus({
        tone: 'success',
        message:
          resume.ats_score !== undefined && resume.ats_score !== null
            ? `Resume loaded. ATS Score: ${resume.ats_score.toFixed(1)}/100`
            : 'Resume loaded and ready for edits.',
      })
      toast.success('Resume loaded for editing')
    } catch {
      toast.error(GENERIC_ERROR_MESSAGE)
      navigate('/app/create-resume', { replace: true })
    } finally {
      setIsLoadingResume(false)
    }
  }

  const generateMutation = useMutation({
    mutationFn: async (data: { job_description: string; instructions?: string }) => {
      const queuedTask = await resumesApi.generate(data)
      return waitForTaskCompletion<{
        status: string
        status_message: string
        resume_id?: string
        has_pdf?: boolean
        ats_score?: number
        assistant_response?: string
        resume_title?: string
      }>(queuedTask.data.job_id, {
        onStatusChange: (queueStatus: string, queueMessage: string) => {
          setPageStatus({
            tone: queueStatus === 'failed' ? 'error' : 'working',
            message: queueMessage || 'Generating resume...',
          })
        },
      })
    },
    onMutate: () => {
      setPageStatus({
        tone: 'working',
        message: 'Starting resume generation...',
      })
    },
    onSuccess: (data) => {
      setResumeId(data.resume_id ?? null)
      setHasPdf(!!data.has_pdf)
      setAutoRecompileTrigger((prev) => prev + 1)
      setPageStatus({
        tone: 'success',
        message: data.status_message || 'Resume generated successfully.',
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data.assistant_response ||
            `Resume generated successfully. ${data.has_pdf ? 'PDF preview is ready.' : 'LaTeX output is available.'}`,
        },
      ])
      toast.success('Resume generated!')
      if (data.resume_id) fetchResumeDetails(data.resume_id)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || GENERIC_ERROR_MESSAGE
      setPageStatus({
        tone: 'error',
        message,
      })
      toast.error(message)
    },
  })

  const refineMutation = useMutation({
    mutationFn: async (message: string) => {
      const queuedTask = await resumesApi.refine(resumeId!, { message })
      return waitForTaskCompletion<{
        status: string
        status_message: string
        resume_id?: string
        has_pdf?: boolean
        ats_score?: number
        assistant_response?: string
        resume_title?: string
      }>(queuedTask.data.job_id, {
        onStatusChange: (queueStatus: string, queueMessage: string) => {
          setPageStatus({
            tone: queueStatus === 'failed' ? 'error' : 'working',
            message: queueMessage || 'Applying your requested changes...',
          })
        },
      })
    },
    onMutate: () => {
      setPageStatus({
        tone: 'working',
        message: 'Applying your requested changes...',
      })
    },
    onSuccess: (data) => {
      setHasPdf(!!data.has_pdf)
      setAutoRecompileTrigger((prev) => prev + 1)
      setPageStatus({
        tone: 'success',
        message: data.status_message || 'Changes applied successfully.',
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.assistant_response || 'Changes applied. Preview and exports are updated.',
        },
      ])
      toast.success('Resume updated!')
      if (resumeId) fetchResumeDetails(resumeId)
    },
    onError: (error: any) => {
      const message = error?.message || GENERIC_ERROR_MESSAGE
      setPageStatus({
        tone: 'error',
        message,
      })
      toast.error(message)
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not apply those changes. Please rephrase and retry.' }])
    },
  })

  const fetchResumeDetails = async (id: string) => {
    try {
      const response = await resumesApi.get(id)
      setHasPdf(response.data.has_pdf || false)
      setResumeId(id)
    } catch {
      toast.error('Failed to refresh resume details')
    }
  }

  const handleGenerate = () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description')
      return
    }

    setMessages([
      {
        role: 'user',
        content: `Generate a resume for:\n\n${jobDescription}${instructions ? `\n\nInstructions: ${instructions}` : ''}`,
      },
    ])

    generateMutation.mutate({
      job_description: jobDescription,
      instructions: instructions || undefined,
    })
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || !resumeId) return
    setMessages((prev) => [...prev, { role: 'user', content: chatInput }])
    refineMutation.mutate(chatInput)
    setChatInput('')
  }

  const handleDownloadPdf = async () => {
    if (!resumeId) return
    try {
      toast.loading('Downloading PDF...', { id: 'pdf-download' })
      const response = await resumesApi.getPdf(resumeId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      if (blob.size < 10000) {
        toast.error('PDF may be invalid. Try recompiling.', { id: 'pdf-download' })
        return
      }
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`PDF downloaded (${Math.round(blob.size / 1024)}KB)`, { id: 'pdf-download' })
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to download PDF', { id: 'pdf-download' })
    }
  }

  const handleDownloadLatex = async () => {
    if (!resumeId) return
    try {
      const response = await resumesApi.getLatex(resumeId)
      const blob = new Blob([response.data], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.tex'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('LaTeX file downloaded')
    } catch {
      toast.error('Failed to download LaTeX')
    }
  }

  const handleReset = () => {
    setJobDescription('')
    setInstructions('')
    setMessages([])
    setResumeId(null)
    setHasPdf(false)
    setPageStatus({
      tone: 'idle',
      message: 'Ready to generate a tailored resume.',
    })
  }

  const isGenerating = generateMutation.isPending || refineMutation.isPending
  const isBusy = isLoadingResume || isGenerating
  const isEditMode = !!editResumeId

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="resume-builder-grid h-[calc(100vh-8rem)] overflow-hidden"
    >
      <Card className="builder-card flex h-full min-h-0 flex-col overflow-hidden">
        <CardHeader className="builder-header">
          <CardTitle className="flex items-center gap-2 text-[#171717]">
            {isEditMode ? 'Edit Resume' : 'Generate Resume'}
          </CardTitle>
          <CardDescription className="text-[#666666]">
            {isEditMode
              ? 'Refine and regenerate with better precision.'
              : 'Paste the target job description and generate a tailored resume.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className={`builder-status-banner builder-status-banner--${pageStatus.tone}`}>
            <span>{pageStatus.message}</span>
          </div>
          {!resumeId && !isEditMode ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4d4d4d]">Job Description *</label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full JD, responsibilities, skills, and team requirements..."
                  className="builder-textarea"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#4d4d4d]">Additional Instructions</label>
                <Input
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., Focus on backend impact, leadership, and distributed systems."
                  className="builder-input"
                  disabled={isGenerating}
                />
              </div>

              <div className="builder-generate-wrap">
                <div className="builder-generate-button-wrap">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !jobDescription.trim()}
                    className="builder-generate-btn"
                  >
                    <span className="builder-generate-label">
                      {isGenerating ? 'Generating Resume...' : 'Generate Resume'}
                    </span>
                  </button>
                  <div className="builder-generate-shadow" />
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="100%"
                  width="100%"
                  className="builder-generate-grid"
                >
                  <defs>
                    <pattern patternUnits="userSpaceOnUse" height={30} width={30} id="builderDottedGrid">
                      <circle fill="rgba(0,0,0,0.12)" r={1} cy={2} cx={2} />
                    </pattern>
                  </defs>
                  <rect fill="url(#builderDottedGrid)" height="100%" width="100%" />
                </svg>
              </div>
            </>
          ) : (
            <>
              <div className="builder-chat-shell flex-1 min-h-0">
                <div className="builder-chat">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`builder-message ${msg.role}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}

                  {isGenerating ? (
                    <div className="builder-message assistant">
                      <span>Applying changes...</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="builder-chat-input-row">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Request improvements... (e.g., Quantify impact and strengthen ATS keywords)"
                  className="builder-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isGenerating}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isGenerating || !chatInput.trim()}
                  className="builder-send-fancy"
                >
                  <svg className="send-icon" xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      fillOpacity="0.4"
                      d="m16.066 10.184l-3.89-1.795c-2.154-.994-3.231-1.491-3.725-.982c-.493.509.038 1.572 1.101 3.698c.22.44.33.659.33.895s-.11.456-.33.895c-1.063 2.126-1.594 3.19-1.1 3.698c.493.51 1.57.012 3.725-.982l3.889-1.795c1.698-.784 2.548-1.176 2.548-1.816c0-.64-.85-1.032-2.549-1.816"
                    />
                    <path
                      fill="currentColor"
                      d="M8.895 11.684L8.174 9.52a1 1 0 0 0-.707-.654l-1.78-.445a.8.8 0 0 0-.91 1.134l1.111 2.22a.5.5 0 0 1 0 .448l-1.11 2.22a.8.8 0 0 0 .91 1.134l1.78-.445a1 1 0 0 0 .706-.654l.72-2.163a1 1 0 0 0 0-.632"
                    />
                  </svg>
                  <span>Send Message</span>
                </button>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                {hasPdf ? (
                  <Button onClick={handleDownloadPdf} className="builder-action-btn builder-action-btn--primary">
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </Button>
                ) : (
                  <div />
                )}
                <Button onClick={handleDownloadLatex} variant="outline" className="builder-action-btn builder-action-btn--secondary">
                  <FileText className="h-4 w-4" />
                  <span>Download LaTeX</span>
                </Button>
                <Button onClick={handleReset} variant="ghost" size="icon" className="builder-reset-btn">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="builder-card flex h-full min-h-0 flex-col overflow-hidden">
        <CardHeader className="builder-header">
          <CardTitle className="flex items-center gap-2 text-[#171717]">
            <FileText className="h-5 w-5 text-[#0a72ef]" />
            Resume Preview
          </CardTitle>
          <CardDescription className="text-[#666666]">
            {resumeId ? 'Interactive preview with recompile controls.' : 'Preview will appear once you generate a resume.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {resumeId ? (
            <PDFPreview resumeId={resumeId} autoRecompileTrigger={autoRecompileTrigger} />
          ) : (
            <div className="preview-state h-full">
              <FileText className="h-14 w-14 text-slate-200" />
              <p className="preview-state-title">No Preview Yet</p>
              <p className="preview-state-subtitle">Generate a resume to unlock live PDF preview and export actions.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isBusy ? (
        <div className="builder-blocking-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="builder-blocking-overlay__card">
            <NewtonLoader size="lg" />
            <p className="builder-blocking-overlay__title">{isLoadingResume ? 'Loading Resume' : 'Please wait'}</p>
            <p className="builder-blocking-overlay__text">{pageStatus.message}</p>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}

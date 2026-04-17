import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, FileText, Send, Loader2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumesApi } from '@/lib/api'
import { useAgentStore } from '@/lib/store'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// PDF Preview Component with Recompile option
function PDFPreview({ resumeId, onRecompile }: { resumeId: string; onRecompile?: () => void }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recompiling, setRecompiling] = useState(false)

  const loadPDF = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get PDF blob from API (this triggers Docker LaTeX compilation)
      console.log('Loading PDF preview for resume:', resumeId)
      const response = await resumesApi.getPreview(resumeId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      
      // Check if PDF is valid size (Docker LaTeX produces 20KB+)
      if (blob.size < 10000) {
        console.warn('PDF size too small:', blob.size, 'bytes - may be invalid')
      } else {
        console.log('PDF loaded successfully:', blob.size, 'bytes')
      }
      
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err: any) {
      console.error('Failed to load PDF:', err)
      setError(err?.response?.data?.detail || 'Failed to load PDF preview')
    } finally {
      setLoading(false)
    }
  }

  const handleRecompile = async () => {
    try {
      setRecompiling(true)
      setError(null)
      console.log('Force recompiling PDF with Docker LaTeX...')
      await resumesApi.recompile(resumeId)
      // Reload the preview after recompile
      await loadPDF()
      if (onRecompile) onRecompile()
    } catch (err: any) {
      console.error('Recompile failed:', err)
      setError(err?.response?.data?.detail || 'Failed to recompile PDF')
    } finally {
      setRecompiling(false)
    }
  }

  useEffect(() => {
    loadPDF()

    // Cleanup URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [resumeId])

  if (loading || recompiling) {
    return (
      <div className="w-full flex-1 border border-gray-200 rounded flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-600">
            {recompiling ? 'Recompiling PDF with Docker LaTeX...' : 'Compiling PDF with Docker LaTeX...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">This may take 10-20 seconds</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full flex-1 border border-gray-200 rounded flex items-center justify-center bg-red-50">
          <div className="text-center p-4">
            <FileText className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button onClick={handleRecompile} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Compilation
          </Button>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="w-full flex-1 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No PDF available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex justify-end mb-2">
        <Button onClick={handleRecompile} size="sm" variant="ghost" disabled={recompiling}>
          <RefreshCw className={`h-4 w-4 mr-1 ${recompiling ? 'animate-spin' : ''}`} />
          Recompile
        </Button>
      </div>
      <iframe
        src={pdfUrl}
        className="w-full flex-1 border border-gray-200 rounded min-h-[600px]"
        title="Resume Preview"
      />
    </div>
  )
}

export function CreateResumePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editResumeId = searchParams.get('edit')
  
  const { setStatus, resetStatus } = useAgentStore()
  const [jobDescription, setJobDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [hasPdf, setHasPdf] = useState(false)
  const [isLoadingResume, setIsLoadingResume] = useState(false)

  // Load existing resume when in edit mode
  useEffect(() => {
    if (editResumeId) {
      loadExistingResume(editResumeId)
    }
  }, [editResumeId])

  const loadExistingResume = async (id: string) => {
    try {
      setIsLoadingResume(true)
      console.log('Loading existing resume:', id)
      
      const response = await resumesApi.get(id)
      const resume = response.data
      
      console.log('Resume loaded:', resume)
      
      // Set resume ID to trigger preview
      setResumeId(id)
      
      // Pre-fill job description if available
      if (resume.job_description) {
        setJobDescription(resume.job_description)
      }
      
      setHasPdf(resume.has_pdf || true) // Assume PDF exists for edit mode
      
      // Add welcome message for edit mode
      setMessages([{
        role: 'assistant',
        content: `Loaded resume: **${resume.title}**\n\nThe PDF preview is loading on the right. You can:\n- View and download the PDF\n- Make changes using the chat below\n- Update the job description and regenerate`
      }])
      
      toast.success('Resume loaded for editing')
    } catch (error: any) {
      console.error('Failed to load resume:', error)
      toast.error(error.response?.data?.detail || 'Resume not found. You can create a new one.')
      // Clear edit mode params - allow creating new resume
      navigate('/app/create-resume', { replace: true })
    } finally {
      setIsLoadingResume(false)
    }
  }

  const generateMutation = useMutation({
    mutationFn: (data: { job_description: string; instructions?: string }) =>
      resumesApi.generate(data),
    onMutate: () => {
      setStatus({ status: 'planning', message: 'Starting resume generation...', progress: 10 })
    },
    onSuccess: (response) => {
      const data = response.data
      setResumeId(data.resume_id)
      setHasPdf(data.has_pdf)
      setStatus({ status: 'completed', message: 'Resume generated!', progress: 100 })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Resume generated successfully. ${data.has_pdf ? 'PDF is ready for download.' : 'LaTeX code is available.'}\n\nWould you like to make any changes?`
      }])
      toast.success('Resume generated!')
      
      // Fetch the resume details
      if (data.resume_id) {
        fetchResumeDetails(data.resume_id)
      }
    },
    onError: (error: any) => {
      setStatus({ status: 'error', message: 'Generation failed', progress: 0 })
      toast.error(error.response?.data?.detail || 'Failed to generate resume')
    },
  })

  const refineMutation = useMutation({
    mutationFn: (message: string) =>
      resumesApi.refine(resumeId!, { message }),
    onMutate: () => {
      setStatus({ status: 'refining', message: 'Applying changes...', progress: 50 })
    },
    onSuccess: (response) => {
      const data = response.data
      setHasPdf(data.has_pdf)
      setStatus({ status: 'completed', message: 'Changes applied!', progress: 100 })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Changes applied. The resume has been updated. Would you like to make any other changes?'
      }])
      toast.success('Resume updated!')
      
      if (resumeId) {
        fetchResumeDetails(resumeId)
      }
    },
    onError: (error: any) => {
      setStatus({ status: 'error', message: 'Refinement failed', progress: 0 })
      toast.error(error.response?.data?.detail || 'Failed to refine resume')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I could not apply those changes. Please try rephrasing your request.'
      }])
    },
  })

  const fetchResumeDetails = async (id: string) => {
    try {
      const response = await resumesApi.get(id)
      setHasPdf(response.data.has_pdf || false)
      // Set the resume ID so the preview component works
      setResumeId(id)
    } catch (error) {
      console.error('Failed to fetch resume details:', error)
    }
  }

  const handleGenerate = () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description')
      return
    }

    setMessages([{
      role: 'user',
      content: `Generate a resume for:\n\n${jobDescription}${instructions ? `\n\nInstructions: ${instructions}` : ''}`
    }])

    generateMutation.mutate({
      job_description: jobDescription,
      instructions: instructions || undefined,
    })
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || !resumeId) return

    setMessages(prev => [...prev, { role: 'user', content: chatInput }])
    refineMutation.mutate(chatInput)
    setChatInput('')
  }

  const handleDownloadPdf = async () => {
    if (!resumeId) return
    
    try {
      toast.loading('Compiling PDF with Docker LaTeX...', { id: 'pdf-download' })
      const response = await resumesApi.getPdf(resumeId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      
      // Check if PDF is valid size
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
      toast.success(`PDF downloaded! (${Math.round(blob.size / 1024)}KB)`, { id: 'pdf-download' })
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
      toast.success('LaTeX file downloaded!')
    } catch (error) {
      toast.error('Failed to download LaTeX')
    }
  }

  const handleReset = () => {
    setJobDescription('')
    setInstructions('')
    setMessages([])
    setResumeId(null)
    setHasPdf(false)
    resetStatus()
  }

  const isGenerating = generateMutation.isPending || refineMutation.isPending
  const isEditMode = !!editResumeId

  // Show loading state while loading resume
  if (isLoadingResume) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading resume...</p>
          <p className="text-sm text-gray-500">Preparing preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Left Panel - Input */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isEditMode ? 'Edit Resume' : 'Generate Resume'}
            </CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Modify your resume or regenerate with updated job description'
                : 'Paste the job description and let AI create a tailored resume'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {(!resumeId && !isEditMode) ? (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Job Description *</label>
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="h-[300px] resize-none"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Additional Instructions (optional)</label>
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Emphasize leadership skills, highlight Python experience..."
                    disabled={isGenerating}
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !jobDescription.trim()}
                  size="lg"
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Resume
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Chat Messages */}
                <div className="flex-1 overflow-auto space-y-4 pr-2">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-message ${msg.role}`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="chat-message assistant">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Working on it...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Request changes... (e.g., Add more technical skills)"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isGenerating}
                  />
                  <Button onClick={handleSendMessage} disabled={isGenerating || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {hasPdf && (
                    <Button onClick={handleDownloadPdf} className="flex-1 gap-2">
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                  <Button onClick={handleDownloadLatex} variant="outline" className="flex-1 gap-2">
                    <FileText className="h-4 w-4" />
                    Download LaTeX
                  </Button>
                  <Button onClick={handleReset} variant="ghost" size="icon">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume Preview
            </CardTitle>
            <CardDescription>
              {resumeId ? 'Your generated resume' : 'Preview will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {resumeId ? (
              <div className="h-full flex flex-col">
                {/* Try iframe first, fallback to API call */}
                <PDFPreview resumeId={resumeId} />
                <div className="text-xs text-gray-500 mt-2 text-center">
                  PDF Preview • If blank, PDF compilation may have failed
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Your resume preview will appear here</p>
                  <p className="text-sm mt-1">Enter a job description and generate</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

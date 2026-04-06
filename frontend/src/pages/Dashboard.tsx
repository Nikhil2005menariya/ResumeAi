import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileText, FolderKanban, Search, Sparkles, Plus, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { resumesApi, projectsApi, profileApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatRelativeTime } from '@/lib/utils'

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then(res => res.data),
  })

  const { data: resumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumesApi.list().then(res => res.data),
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(res => res.data),
  })

  const recentResumes = resumes?.slice(0, 3) || []
  const recentProjects = projects?.slice(0, 3) || []
  const profileCompletion = calculateProfileCompletion(profile)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to create your next amazing resume?
          </p>
        </div>
        <Link to="/app/create-resume">
          <Button size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate New Resume
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Created with AI</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Ready to showcase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <div className={`h-4 w-4 rounded-full ${profileCompletion >= 80 ? 'bg-green-500' : profileCompletion >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCompletion}%</div>
            <p className="text-xs text-muted-foreground">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/app/create-resume" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed hover:border-primary">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">Generate Resume</h3>
              <p className="text-sm text-muted-foreground">Create ATS-optimized resume</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/jobs" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-blue-100 p-4 mb-4">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1">Search Jobs</h3>
              <p className="text-sm text-muted-foreground">Find matching opportunities</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/app/projects" className="block">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-purple-100 p-4 mb-4">
                <Plus className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-1">Add Project</h3>
              <p className="text-sm text-muted-foreground">Showcase your work</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Items */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Resumes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Resumes</CardTitle>
              <CardDescription>Your latest AI-generated resumes</CardDescription>
            </div>
            <Link to="/app/resumes">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentResumes.length > 0 ? (
              <div className="space-y-4">
                {recentResumes.map((resume: any) => (
                  <Link
                    key={resume.id}
                    to={`/app/resumes/${resume.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="rounded-lg bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{resume.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(resume.created_at)}
                      </p>
                    </div>
                    {resume.ats_score && (
                      <span className="text-sm font-medium text-green-600">
                        {resume.ats_score}% ATS
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No resumes yet</p>
                <Link to="/app/create-resume">
                  <Button variant="link" size="sm">Create your first resume</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Projects</CardTitle>
              <CardDescription>Projects to include in resumes</CardDescription>
            </div>
            <Link to="/app/projects">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="rounded-lg bg-purple-100 p-2">
                      <FolderKanban className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{project.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.tech_stack?.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    {project.is_featured && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No projects yet</p>
                <Link to="/app/projects">
                  <Button variant="link" size="sm">Add your first project</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0
  
  let filled = 0
  const fields = [
    profile.headline,
    profile.summary,
    profile.phone,
    profile.location,
    profile.linkedin_url,
    profile.education?.length > 0,
    profile.experience?.length > 0,
    profile.skills?.length > 0,
  ]
  
  fields.forEach(field => {
    if (field) filled++
  })
  
  return Math.round((filled / fields.length) * 100)
}

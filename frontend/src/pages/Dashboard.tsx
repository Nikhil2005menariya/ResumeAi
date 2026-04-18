import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Lottie from 'lottie-react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Sparkles,
  UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { profileApi, projectsApi, resumesApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatRelativeTime } from '@/lib/utils'
import dashboardAnimation from '@/assets/animations/dashboard-workspace.json'

type ResumeItem = {
  id: string
  title: string
  created_at: string
  ats_score?: number | null
}

type ProjectItem = {
  id: string
  title: string
  tech_stack?: string[] | null
  is_featured?: boolean
}

type ProfileShape = {
  headline?: string | null
  summary?: string | null
  phone?: string | null
  location?: string | null
  linkedin_url?: string | null
  education?: unknown[] | null
  experience?: unknown[] | null
  skills?: unknown[] | null
}

export function DashboardPage() {
  const { user } = useAuthStore()

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then((res: any) => res.data as ProfileShape),
  })

  const resumesQuery = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumesApi.list().then((res: any) => res.data as ResumeItem[]),
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((res: any) => res.data as ProjectItem[]),
  })

  const loading = profileQuery.isLoading || resumesQuery.isLoading || projectsQuery.isLoading
  const profile = profileQuery.data
  const resumeList = resumesQuery.data ?? []
  const projectList = projectsQuery.data ?? []

  const profileScore = useMemo(() => computeProfileScore(profile), [profile])

  const stats = useMemo(() => {
    const scoredResumes = resumeList.filter(
      (resume: ResumeItem): resume is ResumeItem & { ats_score: number } => typeof resume.ats_score === 'number'
    )
    const averageAts = scoredResumes.length
      ? Math.round(scoredResumes.reduce((sum: number, resume: ResumeItem & { ats_score: number }) => sum + resume.ats_score, 0) / scoredResumes.length)
      : 0

    return {
      resumes: resumeList.length,
      projects: projectList.length,
      featuredProjects: projectList.filter((project: ProjectItem) => project.is_featured).length,
      highAts: scoredResumes.filter((resume: ResumeItem & { ats_score: number }) => resume.ats_score >= 80).length,
      averageAts,
    }
  }, [projectList, resumeList])

  const recentResumes = useMemo(() => resumeList.slice(0, 4), [resumeList])
  const recentProjects = useMemo(() => projectList.slice(0, 4), [projectList])

  return (
    <div className="page-wrap dashboard-panel space-y-4 rounded-2xl p-4 sm:p-5">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="dashboard-hero-card grid overflow-hidden rounded-2xl lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="space-y-4 p-6 sm:p-7">
          <p className="dashboard-kicker">Resum.Ai Premium Workspace</p>
          <h1 className="dashboard-display text-balance">
            Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'there'}.
          </h1>
          <p className="max-w-xl text-sm text-[#666666] sm:text-[15px]">
            Curated overview for resume generation, project readiness, and profile quality. Every module is tuned for
            speed and clarity.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/app/create-resume">
              <Button className="dashboard-btn-dark h-10 rounded-md px-4">
                Generate Resume
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/app/jobs">
              <Button variant="outline" className="dashboard-btn-light h-10 rounded-md px-4">
                Explore Jobs
              </Button>
            </Link>
          </div>
        </div>

        <div className="hidden items-center justify-center border-l border-[#ebebeb] bg-white p-3 lg:flex">
          <div className="dashboard-lottie-wrap">
            <Lottie animationData={dashboardAnimation} loop />
          </div>
        </div>
      </motion.section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <LoadingStatCard key={index} />)
        ) : (
          <>
            <StatCard label="Resumes" value={stats.resumes} detail={`${stats.highAts} above 80 ATS`} icon={<FileText className="h-4 w-4" />} />
            <StatCard label="Projects" value={stats.projects} detail={`${stats.featuredProjects} featured`} icon={<FolderKanban className="h-4 w-4" />} />
            <StatCard label="Average ATS" value={stats.averageAts ? `${stats.averageAts}%` : '—'} detail="Across scored resumes" icon={<BarChart3 className="h-4 w-4" />} />
            <StatCard label="Profile" value={`${profileScore.percentage}%`} detail={`${profileScore.missing.length} fields pending`} icon={<UserCircle2 className="h-4 w-4" />} />
          </>
        )}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="dashboard-card-clean rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Resumes</CardTitle>
              <CardDescription>Latest generated assets with ATS signal.</CardDescription>
            </div>
            <Link to="/app/resumes">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => <LoadingListRow key={idx} />)
            ) : recentResumes.length > 0 ? (
              recentResumes.map((resume: ResumeItem) => (
                <Link
                  key={resume.id}
                  to={`/app/create-resume?edit=${resume.id}`}
                  className="dashboard-row group flex items-center justify-between rounded-lg px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#171717]">{resume.title}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#666666]">
                      <Clock3 className="h-3 w-3" />
                      {formatRelativeTime(resume.created_at)}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {typeof resume.ats_score === 'number' ? (
                      <span className="dashboard-pill">{resume.ats_score}% ATS</span>
                    ) : null}
                    <ArrowRight className="h-4 w-4 text-[#808080] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyCard icon={<FileText className="h-10 w-10 text-[#bdbdbd]" />} title="No resumes yet" to="/app/create-resume" cta="Create first resume" />
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card-clean rounded-xl">
          <CardHeader>
            <CardTitle>Profile Checklist</CardTitle>
            <CardDescription>Complete these fields to improve role matching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => <LoadingChecklistRow key={idx} />)
            ) : profileScore.missing.length > 0 ? (
              profileScore.missing.slice(0, 5).map((item) => (
                <div key={item} className="dashboard-row flex items-center justify-between rounded-lg px-3 py-2.5">
                  <span className="text-sm text-[#4d4d4d]">{item}</span>
                  <Link to="/app/profile" className="text-xs font-semibold text-[#171717] hover:underline">
                    Update
                  </Link>
                </div>
              ))
            ) : (
              <div className="dashboard-positive rounded-lg px-3 py-3 text-sm">Profile is complete. Great work.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="dashboard-card-clean rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Project Library</CardTitle>
              <CardDescription>Polished project cards ready for resume insertion.</CardDescription>
            </div>
            <Link to="/app/projects">
              <Button variant="ghost" size="sm" className="gap-1">
                Open projects <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <LoadingProjectCard key={idx} />
                ))}
              </div>
            ) : recentProjects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {recentProjects.map((project: ProjectItem) => (
                  <div key={project.id} className="dashboard-row rounded-lg p-3.5">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-semibold text-[#171717]">{project.title}</h3>
                      {project.is_featured ? <span className="dashboard-pill">Featured</span> : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-[#666666]">
                      {project.tech_stack && project.tech_stack.length > 0
                        ? project.tech_stack.slice(0, 4).join(' • ')
                        : 'No tech stack added yet'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyCard
                icon={<FolderKanban className="h-10 w-10 text-[#bdbdbd]" />}
                title="No projects yet"
                to="/app/projects"
                cta="Add first project"
              />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3">
          <ShortcutCard
            to="/app/create-resume"
            title="AI Resume Builder"
            description="Generate and iterate with structured prompts."
            icon={<Sparkles className="h-4 w-4" />}
          />
          <ShortcutCard
            to="/app/jobs"
            title="Job Match Engine"
            description="Search opportunities aligned to your profile."
            icon={<Briefcase className="h-4 w-4" />}
          />
          <ShortcutCard
            to="/app/profile"
            title="Profile Optimizer"
            description="Fill high-impact fields and improve quality score."
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
}) {
  return (
    <Card className="dashboard-card-clean rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-[#4d4d4d]">{label}</CardTitle>
          <span className="dashboard-icon-chip">{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="dashboard-metric">{value}</p>
        <p className="mt-1 text-xs text-[#666666]">{detail}</p>
      </CardContent>
    </Card>
  )
}

function ShortcutCard({
  to,
  title,
  description,
  icon,
}: {
  to: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <Link to={to} className="group block">
      <Card className="dashboard-card-clean rounded-xl transition-[box-shadow] duration-200 group-hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_10px_22px_-18px_rgba(0,0,0,0.25)]">
        <CardContent className="p-4">
          <div className="dashboard-icon-chip mb-2">{icon}</div>
          <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
          <p className="mt-1 text-sm text-[#666666]">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyCard({
  icon,
  title,
  to,
  cta,
}: {
  icon: ReactNode
  title: string
  to: string
  cta: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-8 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center">{icon}</div>
      <p className="mb-3 text-sm text-[#666666]">{title}</p>
      <Link to={to}>
        <Button size="sm" variant="outline" className="dashboard-btn-light">
          {cta}
        </Button>
      </Link>
    </div>
  )
}

function LoadingStatCard() {
  return (
    <Card className="dashboard-card-clean rounded-xl">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="mb-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  )
}

function LoadingListRow() {
  return (
    <div className="dashboard-row rounded-lg px-3 py-3">
      <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

function LoadingChecklistRow() {
  return <div className="dashboard-row h-10 animate-pulse rounded-lg bg-slate-100/80" />
}

function LoadingProjectCard() {
  return (
    <div className="dashboard-row rounded-lg p-3.5">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

function computeProfileScore(profile?: ProfileShape): { percentage: number; missing: string[] } {
  if (!profile) {
    return {
      percentage: 0,
      missing: ['Professional headline', 'Summary', 'Phone number', 'Location', 'LinkedIn URL', 'Education', 'Experience', 'Skills'],
    }
  }

  const fields = [
    { label: 'Professional headline', value: profile.headline },
    { label: 'Summary', value: profile.summary },
    { label: 'Phone number', value: profile.phone },
    { label: 'Location', value: profile.location },
    { label: 'LinkedIn URL', value: profile.linkedin_url },
    { label: 'Education', value: Boolean(profile.education && profile.education.length > 0) },
    { label: 'Experience', value: Boolean(profile.experience && profile.experience.length > 0) },
    { label: 'Skills', value: Boolean(profile.skills && profile.skills.length > 0) },
  ]

  const filled = fields.filter((item) => Boolean(item.value)).length
  const missing = fields.filter((item) => !item.value).map((item) => item.label)

  return {
    percentage: Math.round((filled / fields.length) * 100),
    missing,
  }
}

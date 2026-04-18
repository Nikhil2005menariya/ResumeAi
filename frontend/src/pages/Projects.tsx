import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  FolderKanban,
  Plus,
  Edit2,
  Star,
  ExternalLink,
  Github,
  Loader2,
  X,
} from 'lucide-react'
import { AnimatedDeleteButton } from '@/components/AnimatedDeleteButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { projectsApi } from '@/lib/api'

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((res: any) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created!')
      setIsAdding(false)
    },
    onError: () => toast.error('Failed to create project'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project updated!')
      setEditingId(null)
    },
    onError: () => toast.error('Failed to update project'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted!')
    },
    onError: () => toast.error('Failed to delete project'),
  })

  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: string) => projectsApi.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Featured status updated!')
    },
    onError: () => toast.error('Failed to update featured status'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="page-wrap space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Projects</h1>
          <p className="mt-1 text-slate-600">
            Showcase your work for AI-powered resume generation
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="dashboard-btn-dark h-10 gap-2 rounded-md px-4"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>

      {isAdding && (
        <ProjectForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setIsAdding(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            editingId === project.id ? (
              <ProjectForm
                key={project.id}
                defaultValues={project}
                onSubmit={(data) => updateMutation.mutate({ id: project.id, data })}
                onCancel={() => setEditingId(null)}
                isSubmitting={updateMutation.isPending}
              />
            ) : (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => setEditingId(project.id)}
                onDelete={() => deleteMutation.mutate(project.id)}
                onToggleFeatured={() => toggleFeaturedMutation.mutate(project.id)}
                isDeleting={deleteMutation.isPending}
              />
            )
          ))}
        </div>
      ) : !isAdding ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold">No projects yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Add your projects to include them in AI-generated resumes
            </p>
            <Button
              onClick={() => setIsAdding(true)}
              className="dashboard-btn-dark mt-4 h-10 gap-2 rounded-md px-4"
            >
              <Plus className="h-4 w-4" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

interface ProjectFormProps {
  defaultValues?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  isSubmitting: boolean
}

function ProjectForm({ defaultValues, onSubmit, onCancel, isSubmitting }: ProjectFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: defaultValues?.title || '',
      description: defaultValues?.description || '',
      tech_stack: defaultValues?.tech_stack?.join(', ') || '',
      url: defaultValues?.url || '',
      github_url: defaultValues?.github_url || '',
      start_date: defaultValues?.start_date || '',
      end_date: defaultValues?.end_date || '',
      highlights: defaultValues?.highlights?.join('\n') || '',
    },
  })

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      tech_stack: data.tech_stack.split(',').map((s: string) => s.trim()).filter(Boolean),
      highlights: data.highlights.split('\n').filter(Boolean),
    })
  }

  return (
    <Card className="glass-card col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{defaultValues ? 'Edit Project' : 'New Project'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Project Title *</label>
              <Input {...register('title')} placeholder="e.g., E-commerce Platform" required />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Description *</label>
              <Textarea
                {...register('description')}
                placeholder="Describe what the project does and your role..."
                rows={3}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Tech Stack (comma-separated)</label>
              <Input
                {...register('tech_stack')}
                placeholder="e.g., React, Node.js, PostgreSQL, AWS"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Live URL</label>
              <Input {...register('url')} placeholder="https://..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">GitHub URL</label>
              <Input {...register('github_url')} placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input {...register('start_date')} placeholder="e.g., Jan 2023" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input {...register('end_date')} placeholder="e.g., Mar 2023 (or leave blank if ongoing)" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Key Highlights (one per line)</label>
              <Textarea
                {...register('highlights')}
                placeholder="• Increased performance by 40%&#10;• Served 10,000+ users&#10;• Reduced costs by 30%"
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="dashboard-btn-dark h-10 gap-2 rounded-md px-4"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {defaultValues ? 'Update' : 'Create'} Project
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface ProjectCardProps {
  project: any
  onEdit: () => void
  onDelete: () => void
  onToggleFeatured: () => void
  isDeleting: boolean
}

function ProjectCard({ project, onEdit, onDelete, onToggleFeatured, isDeleting }: ProjectCardProps) {
  return (
    <Card className={`glass-card transition-all ${project.is_featured ? 'ring-2 ring-yellow-400' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{project.title}</CardTitle>
          <button
            onClick={onToggleFeatured}
            className={`p-1 rounded ${project.is_featured ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
            title={project.is_featured ? 'Remove from featured' : 'Mark as featured'}
          >
            <Star className={`h-4 w-4 ${project.is_featured ? 'fill-current' : ''}`} />
          </button>
        </div>
        {project.tech_stack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tech_stack.slice(0, 4).map((tech: string, idx: number) => (
              <span
                key={idx}
                className="text-xs bg-muted px-2 py-0.5 rounded"
              >
                {tech}
              </span>
            ))}
            {project.tech_stack.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{project.tech_stack.length - 4} more
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {project.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          {project.start_date && (
            <span>{project.start_date} - {project.end_date || 'Present'}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-muted rounded"
                title="View live"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-muted rounded"
                title="View source"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AnimatedDeleteButton onClick={onDelete} disabled={isDeleting} label="Delete project" compact />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

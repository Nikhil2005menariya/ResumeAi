import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  User,
  MapPin,
  Phone,
  Link,
  Briefcase,
  GraduationCap,
  Code,
  Plus,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react'
import { AnimatedDeleteButton } from '@/components/AnimatedDeleteButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { profileApi } from '@/lib/api'

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'education' | 'experience' | 'skills'>('info')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get().then((res: any) => res.data),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => profileApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profile updated!')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="page-wrap max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">My Profile</h1>
        <p className="mt-1 text-slate-600">
          Keep your profile updated for better resume generation
        </p>
      </div>

      <div className="profile-tabs-wrap flex gap-2 rounded-2xl p-2">
        {[
          { id: 'info', label: 'Basic Info', icon: User },
          { id: 'education', label: 'Education', icon: GraduationCap },
          { id: 'experience', label: 'Experience', icon: Briefcase },
          { id: 'skills', label: 'Skills', icon: Code },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'profile-tab-btn profile-tab-btn--active'
                : 'profile-tab-btn profile-tab-btn--idle'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <BasicInfoTab profile={profile} onUpdate={(data) => updateMutation.mutate(data)} isUpdating={updateMutation.isPending} />
      )}
      {activeTab === 'education' && (
        <EducationTab profile={profile} />
      )}
      {activeTab === 'experience' && (
        <ExperienceTab profile={profile} />
      )}
      {activeTab === 'skills' && (
        <SkillsTab profile={profile} />
      )}
    </div>
  )
}

function BasicInfoTab({ profile, onUpdate, isUpdating }: { profile: any; onUpdate: (data: any) => void; isUpdating: boolean }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      headline: profile?.headline || '',
      summary: profile?.summary || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      linkedin_url: profile?.linkedin_url || '',
      github_url: profile?.github_url || '',
      portfolio_url: profile?.portfolio_url || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onUpdate)}>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Your personal and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Professional Headline</label>
              <Input
                {...register('headline')}
                placeholder="e.g., Full Stack Developer | React & Node.js Expert"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Summary</label>
              <Textarea
                {...register('summary')}
                placeholder="A brief summary of your professional background..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone
              </label>
              <Input {...register('phone')} placeholder="+1 (555) 123-4567" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location
              </label>
              <Input {...register('location')} placeholder="San Francisco, CA" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Link className="h-4 w-4" /> LinkedIn
              </label>
              <Input {...register('linkedin_url')} placeholder="https://linkedin.com/in/..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Link className="h-4 w-4" /> GitHub
              </label>
              <Input {...register('github_url')} placeholder="https://github.com/..." />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Link className="h-4 w-4" /> Portfolio
              </label>
              <Input {...register('portfolio_url')} placeholder="https://yourportfolio.com" />
            </div>
          </div>
          <Button type="submit" disabled={isUpdating} className="dashboard-btn-dark h-10 gap-2 rounded-md px-4">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}

function EducationTab({ profile }: { profile: any }) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const addMutation = useMutation({
    mutationFn: (data: any) => profileApi.addEducation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Education added!')
      setIsAdding(false)
      reset()
    },
    onError: () => toast.error('Failed to add education'),
  })

  const deleteMutation = useMutation({
    mutationFn: (index: number) => profileApi.deleteEducation(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Education removed!')
    },
    onError: () => toast.error('Failed to remove education'),
  })

  return (
    <div className="space-y-4">
      {profile?.education?.map((edu: any, index: number) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{edu.degree}</h3>
                <p className="text-muted-foreground">{edu.institution}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.start_date} - {edu.end_date || 'Present'}
                </p>
                {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
              </div>
              <AnimatedDeleteButton
                onClick={() => deleteMutation.mutate(index)}
                disabled={deleteMutation.isPending}
                label="Delete education"
                compact
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {isAdding ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => addMutation.mutate(data))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Degree *</label>
                  <Input {...register('degree')} placeholder="e.g., B.S. Computer Science" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Institution *</label>
                  <Input {...register('institution')} placeholder="e.g., Stanford University" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input {...register('start_date')} placeholder="e.g., Sep 2018" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input {...register('end_date')} placeholder="e.g., May 2022 (or leave blank if current)" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">GPA</label>
                  <Input {...register('gpa')} placeholder="e.g., 3.8/4.0" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="dashboard-btn-dark h-10 gap-2 rounded-md px-4"
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Education
        </Button>
      )}
    </div>
  )
}

function ExperienceTab({ profile }: { profile: any }) {
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const addMutation = useMutation({
    mutationFn: (data: any) => profileApi.addExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Experience added!')
      setIsAdding(false)
      reset()
    },
    onError: () => toast.error('Failed to add experience'),
  })

  const deleteMutation = useMutation({
    mutationFn: (index: number) => profileApi.deleteExperience(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Experience removed!')
    },
    onError: () => toast.error('Failed to remove experience'),
  })

  return (
    <div className="space-y-4">
      {profile?.experience?.map((exp: any, index: number) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{exp.position}</h3>
                <p className="text-muted-foreground">{exp.company}</p>
                <p className="text-sm text-muted-foreground">
                  {exp.start_date} - {exp.end_date || 'Present'} {exp.location && `• ${exp.location}`}
                </p>
                {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
              </div>
              <AnimatedDeleteButton
                onClick={() => deleteMutation.mutate(index)}
                disabled={deleteMutation.isPending}
                label="Delete experience"
                compact
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {isAdding ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit((data) => addMutation.mutate(data))} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Position *</label>
                  <Input {...register('position')} placeholder="e.g., Software Engineer" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Company *</label>
                  <Input {...register('company')} placeholder="e.g., Google" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <Input {...register('location')} placeholder="e.g., Mountain View, CA" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date *</label>
                  <Input {...register('start_date')} placeholder="e.g., Jan 2020" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input {...register('end_date')} placeholder="e.g., Dec 2023 (or leave blank if current)" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea {...register('description')} placeholder="Describe your responsibilities and achievements..." rows={3} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="dashboard-btn-dark h-10 gap-2 rounded-md px-4"
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Experience
        </Button>
      )}
    </div>
  )
}

function SkillsTab({ profile }: { profile: any }) {
  const queryClient = useQueryClient()
  const [newSkill, setNewSkill] = useState('')

  const addMutation = useMutation({
    mutationFn: (skill: { name: string }) => profileApi.addSkill(skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Skill added!')
      setNewSkill('')
    },
    onError: () => toast.error('Failed to add skill'),
  })

  const deleteMutation = useMutation({
    mutationFn: (index: number) => profileApi.deleteSkill(index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Skill removed!')
    },
    onError: () => toast.error('Failed to remove skill'),
  })

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSkill.trim()) return
    addMutation.mutate({ name: newSkill.trim() })
  }

  return (
    <div className="space-y-4">
      <Card className="profile-skills-card">
        <CardHeader>
          <CardTitle>Technical Skills</CardTitle>
          <CardDescription>Add skills that showcase your expertise</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddSkill} className="profile-skills-form">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g., React, Python, AWS..."
              disabled={addMutation.isPending}
              className="profile-skills-input"
            />
            <Button
              type="submit"
              disabled={addMutation.isPending || !newSkill.trim()}
              className="profile-skills-add-btn"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>

          <div className="profile-skills-grid">
            {profile?.skills?.map((skill: any, index: number) => (
              <span
                key={index}
                className="profile-skills-chip"
              >
                {skill.name}
                <button
                  onClick={() => deleteMutation.mutate(index)}
                  disabled={deleteMutation.isPending}
                  className="profile-skills-chip-delete"
                  type="button"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react';
import type { Project } from '../types/resume';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

export function ProjectsForm({ data, onChange }: ProjectsFormProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: '',
      description: '',
      technologies: [],
      link: '',
    };
    onChange([...data, newProject]);
    setExpandedId(newProject.id);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    onChange(data.map(proj => proj.id === id ? { ...proj, ...updates } : proj));
  };

  const removeProject = (id: string) => {
    onChange(data.filter(proj => proj.id !== id));
  };

  const handleTechnologiesChange = (id: string, value: string) => {
    const techs = value.split(',').map(t => t.trim()).filter(Boolean);
    updateProject(id, { technologies: techs });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Projects</h3>
        <button
          onClick={addProject}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Project
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No projects added yet. Click "Add Project" to showcase your work.</p>
      )}

      <div className="space-y-3">
        {data.map((proj) => (
          <div key={proj.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
              onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
            >
              <div>
                <span className="font-medium">{proj.name || 'New Project'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); removeProject(proj.id); }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
                <span className="text-gray-400">{expandedId === proj.id ? '▼' : '▶'}</span>
              </div>
            </div>

            {expandedId === proj.id && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="My Awesome Project"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <input
                      type="text"
                      value={proj.link}
                      onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="github.com/user/project"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={proj.description}
                      onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of what the project does..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technologies (comma-separated)</label>
                    <input
                      type="text"
                      value={proj.technologies.join(', ')}
                      onChange={(e) => handleTechnologiesChange(proj.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="React, Node.js, PostgreSQL"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

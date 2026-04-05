import { useState } from 'react';
import type { WorkExperience } from '../types/resume';

interface WorkExperienceFormProps {
  data: WorkExperience[];
  onChange: (data: WorkExperience[]) => void;
}

export function WorkExperienceForm({ data, onChange }: WorkExperienceFormProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addExperience = () => {
    const newExp: WorkExperience = {
      id: Date.now().toString(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      responsibilities: [''],
    };
    onChange([...data, newExp]);
    setExpandedId(newExp.id);
  };

  const updateExperience = (id: string, updates: Partial<WorkExperience>) => {
    onChange(data.map(exp => exp.id === id ? { ...exp, ...updates } : exp));
  };

  const removeExperience = (id: string) => {
    onChange(data.filter(exp => exp.id !== id));
  };

  const addResponsibility = (id: string) => {
    const exp = data.find(e => e.id === id);
    if (exp) {
      updateExperience(id, { responsibilities: [...exp.responsibilities, ''] });
    }
  };

  const updateResponsibility = (id: string, index: number, value: string) => {
    const exp = data.find(e => e.id === id);
    if (exp) {
      const newResp = [...exp.responsibilities];
      newResp[index] = value;
      updateExperience(id, { responsibilities: newResp });
    }
  };

  const removeResponsibility = (id: string, index: number) => {
    const exp = data.find(e => e.id === id);
    if (exp && exp.responsibilities.length > 1) {
      const newResp = exp.responsibilities.filter((_, i) => i !== index);
      updateExperience(id, { responsibilities: newResp });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Work Experience</h3>
        <button
          onClick={addExperience}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Add Experience
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No work experience added yet. Click "Add Experience" to start.</p>
      )}

      <div className="space-y-3">
        {data.map((exp) => (
          <div key={exp.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
              onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
            >
              <div>
                <span className="font-medium">{exp.position || 'New Position'}</span>
                {exp.company && <span className="text-gray-600"> at {exp.company}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); removeExperience(exp.id); }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
                <span className="text-gray-400">{expandedId === exp.id ? '▼' : '▶'}</span>
              </div>
            </div>

            {expandedId === exp.id && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                    <input
                      type="text"
                      value={exp.position}
                      onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tech Company Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="month"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                        disabled={exp.current}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`current-${exp.id}`}
                    checked={exp.current}
                    onChange={(e) => updateExperience(exp.id, { current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                    className="rounded"
                  />
                  <label htmlFor={`current-${exp.id}`} className="text-sm text-gray-700">I currently work here</label>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Responsibilities / Achievements</label>
                    <button
                      onClick={() => addResponsibility(exp.id)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add bullet point
                    </button>
                  </div>
                  <div className="space-y-2">
                    {exp.responsibilities.map((resp, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={resp}
                          onChange={(e) => updateResponsibility(exp.id, idx, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Describe your achievement or responsibility..."
                        />
                        {exp.responsibilities.length > 1 && (
                          <button
                            onClick={() => removeResponsibility(exp.id, idx)}
                            className="px-2 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
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

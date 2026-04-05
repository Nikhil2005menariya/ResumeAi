import { forwardRef } from 'react';
import type { ResumeData } from '../types/resume';

interface ResumePreviewProps {
  data: ResumeData;
  template?: 'classic' | 'modern';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  ({ data, template = 'classic' }, ref) => {
    const { personalInfo, summary, workExperience, education, skills, projects } = data;

    if (template === 'modern') {
      return <ModernTemplate data={data} ref={ref} />;
    }

    return (
      <div
        ref={ref}
        className="print-container bg-white p-8 shadow-lg min-h-[1056px] w-full max-w-[816px] mx-auto text-gray-800"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {/* Header */}
        <header className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-3xl font-bold tracking-wide mb-2">{personalInfo.fullName || 'Your Name'}</h1>
          <div className="text-sm text-gray-600 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {personalInfo.email && <span>{personalInfo.email}</span>}
            {personalInfo.phone && <span>• {personalInfo.phone}</span>}
            {personalInfo.location && <span>• {personalInfo.location}</span>}
          </div>
          <div className="text-sm text-gray-600 flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
            {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
            {personalInfo.github && <span>• {personalInfo.github}</span>}
            {personalInfo.website && <span>• {personalInfo.website}</span>}
          </div>
        </header>

        {/* Summary */}
        {summary && (
          <section className="mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Professional Summary
            </h2>
            <p className="text-sm leading-relaxed">{summary}</p>
          </section>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Experience
            </h2>
            {workExperience.map((exp) => (
              <div key={exp.id} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{exp.position}</h3>
                    <p className="text-sm italic">{exp.company}{exp.location && `, ${exp.location}`}</p>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.responsibilities.filter(r => r.trim()).length > 0 && (
                  <ul className="list-disc list-inside text-sm mt-1 ml-2 space-y-0.5">
                    {exp.responsibilities.filter(r => r.trim()).map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Education
            </h2>
            {education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                    <p className="text-sm italic">{edu.school}{edu.location && `, ${edu.location}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                    </span>
                    {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Skills
            </h2>
            <p className="text-sm">{skills.join(' • ')}</p>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-400 mb-2">
              Projects
            </h2>
            {projects.map((proj) => (
              <div key={proj.id} className="mb-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold">{proj.name}</h3>
                  {proj.link && <span className="text-sm text-gray-600">{proj.link}</span>}
                </div>
                {proj.description && <p className="text-sm">{proj.description}</p>}
                {proj.technologies.length > 0 && (
                  <p className="text-sm text-gray-600 italic">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }
);

const ModernTemplate = forwardRef<HTMLDivElement, { data: ResumeData }>(({ data }, ref) => {
  const { personalInfo, summary, workExperience, education, skills, projects } = data;

  return (
    <div
      ref={ref}
      className="print-container bg-white shadow-lg min-h-[1056px] w-full max-w-[816px] mx-auto"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Header with colored background */}
      <header className="bg-slate-700 text-white p-6">
        <h1 className="text-3xl font-bold mb-2">{personalInfo.fullName || 'Your Name'}</h1>
        <div className="text-sm opacity-90 flex flex-wrap gap-x-4 gap-y-1">
          {personalInfo.email && <span>📧 {personalInfo.email}</span>}
          {personalInfo.phone && <span>📱 {personalInfo.phone}</span>}
          {personalInfo.location && <span>📍 {personalInfo.location}</span>}
        </div>
        <div className="text-sm opacity-90 flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {personalInfo.linkedin && <span>💼 {personalInfo.linkedin}</span>}
          {personalInfo.github && <span>💻 {personalInfo.github}</span>}
          {personalInfo.website && <span>🌐 {personalInfo.website}</span>}
        </div>
      </header>

      <div className="p-6 text-gray-800">
        {/* Summary */}
        {summary && (
          <section className="mb-5">
            <h2 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-700 rounded"></span>
              About Me
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">{summary}</p>
          </section>
        )}

        {/* Work Experience */}
        {workExperience.length > 0 && (
          <section className="mb-5">
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-700 rounded"></span>
              Experience
            </h2>
            {workExperience.map((exp) => (
              <div key={exp.id} className="mb-4 pl-4 border-l-2 border-slate-200">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{exp.position}</h3>
                    <p className="text-sm text-slate-600">{exp.company}{exp.location && ` • ${exp.location}`}</p>
                  </div>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate)}
                  </span>
                </div>
                {exp.responsibilities.filter(r => r.trim()).length > 0 && (
                  <ul className="text-sm mt-2 space-y-1 text-gray-600">
                    {exp.responsibilities.filter(r => r.trim()).map((resp, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-slate-400">→</span>
                        {resp}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section className="mb-5">
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-700 rounded"></span>
              Education
            </h2>
            {education.map((edu) => (
              <div key={edu.id} className="mb-3 pl-4 border-l-2 border-slate-200">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{edu.degree}{edu.field && ` in ${edu.field}`}</h3>
                    <p className="text-sm text-slate-600">{edu.school}{edu.location && ` • ${edu.location}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                      {formatDate(edu.endDate) || formatDate(edu.startDate)}
                    </span>
                    {edu.gpa && <p className="text-xs text-slate-500 mt-1">GPA: {edu.gpa}</p>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section className="mb-5">
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-700 rounded"></span>
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section className="mb-5">
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-slate-700 rounded"></span>
              Projects
            </h2>
            {projects.map((proj) => (
              <div key={proj.id} className="mb-3 pl-4 border-l-2 border-slate-200">
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <h3 className="font-semibold text-slate-800">{proj.name}</h3>
                  {proj.link && <span className="text-xs text-slate-500">{proj.link}</span>}
                </div>
                {proj.description && <p className="text-sm text-gray-600 mt-1">{proj.description}</p>}
                {proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.technologies.map((tech) => (
                      <span key={tech} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
ModernTemplate.displayName = 'ModernTemplate';

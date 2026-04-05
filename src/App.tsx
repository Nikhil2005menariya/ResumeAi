import { useRef, useState } from 'react';
import { useResumeStorage } from './hooks/useResumeStorage';
import { sampleResumeData } from './types/resume';
import {
  PersonalInfoForm,
  SummaryForm,
  WorkExperienceForm,
  EducationForm,
  SkillsForm,
  ProjectsForm,
  ResumePreview,
} from './components';

type Template = 'classic' | 'modern';

function App() {
  const { data, setData, clearData } = useResumeStorage();
  const [template, setTemplate] = useState<Template>('classic');
  const [activeSection, setActiveSection] = useState<string>('personal');
  const resumeRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const loadSampleData = () => {
    setData(sampleResumeData);
  };

  const sections = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Resume Maker</h1>
          <div className="flex gap-2">
            <button
              onClick={loadSampleData}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={clearData}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="no-print">
            {/* Template Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTemplate('classic')}
                  className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                    template === 'classic'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Classic
                </button>
                <button
                  onClick={() => setTemplate('modern')}
                  className={`flex-1 py-2 px-4 rounded-md border-2 transition-colors ${
                    template === 'modern'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Modern
                </button>
              </div>
            </div>

            {/* Section Navigation */}
            <div className="bg-white rounded-lg shadow-sm p-2 mb-4 flex flex-wrap gap-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Form Sections */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {activeSection === 'personal' && (
                <PersonalInfoForm
                  data={data.personalInfo}
                  onChange={(personalInfo) => setData({ ...data, personalInfo })}
                />
              )}
              {activeSection === 'summary' && (
                <SummaryForm
                  data={data.summary}
                  onChange={(summary) => setData({ ...data, summary })}
                />
              )}
              {activeSection === 'experience' && (
                <WorkExperienceForm
                  data={data.workExperience}
                  onChange={(workExperience) => setData({ ...data, workExperience })}
                />
              )}
              {activeSection === 'education' && (
                <EducationForm
                  data={data.education}
                  onChange={(education) => setData({ ...data, education })}
                />
              )}
              {activeSection === 'skills' && (
                <SkillsForm
                  data={data.skills}
                  onChange={(skills) => setData({ ...data, skills })}
                />
              )}
              {activeSection === 'projects' && (
                <ProjectsForm
                  data={data.projects}
                  onChange={(projects) => setData({ ...data, projects })}
                />
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-gray-200 p-4 rounded-lg no-print">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Live Preview</h2>
              <div className="overflow-auto max-h-[calc(100vh-200px)] rounded-lg" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%' }}>
                <ResumePreview ref={resumeRef} data={data} template={template} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print-only resume */}
      <div className="hidden print:block">
        <ResumePreview data={data} template={template} />
      </div>
    </div>
  );
}

export default App;

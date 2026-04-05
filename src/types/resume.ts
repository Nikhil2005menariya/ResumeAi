export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  responsibilities: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  projects: Project[];
}

export const emptyResumeData: ResumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  },
  summary: '',
  workExperience: [],
  education: [],
  skills: [],
  projects: [],
};

export const sampleResumeData: ResumeData = {
  personalInfo: {
    fullName: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    github: 'github.com/alexjohnson',
    website: 'alexjohnson.dev',
  },
  summary: 'Full-stack software engineer with 5+ years of experience building scalable web applications. Passionate about creating elegant solutions to complex problems and mentoring junior developers.',
  workExperience: [
    {
      id: '1',
      company: 'TechCorp Inc.',
      position: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2021-03',
      endDate: '',
      current: true,
      responsibilities: [
        'Led development of microservices architecture serving 1M+ daily users',
        'Mentored team of 4 junior developers, improving code quality by 40%',
        'Implemented CI/CD pipelines reducing deployment time by 60%',
      ],
    },
    {
      id: '2',
      company: 'StartupXYZ',
      position: 'Software Engineer',
      location: 'Remote',
      startDate: '2019-01',
      endDate: '2021-02',
      current: false,
      responsibilities: [
        'Built React-based dashboard used by 500+ enterprise clients',
        'Designed and implemented RESTful APIs with Node.js and PostgreSQL',
        'Reduced page load time by 45% through performance optimization',
      ],
    },
  ],
  education: [
    {
      id: '1',
      school: 'University of California, Berkeley',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      location: 'Berkeley, CA',
      startDate: '2015-08',
      endDate: '2019-05',
      gpa: '3.8',
    },
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git'],
  projects: [
    {
      id: '1',
      name: 'TaskFlow',
      description: 'Open-source project management tool with real-time collaboration features',
      technologies: ['React', 'Node.js', 'Socket.io', 'MongoDB'],
      link: 'github.com/alexjohnson/taskflow',
    },
  ],
};

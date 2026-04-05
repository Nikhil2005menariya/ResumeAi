import { useState } from 'react';

interface SkillsFormProps {
  data: string[];
  onChange: (data: string[]) => void;
}

export function SkillsForm({ data, onChange }: SkillsFormProps) {
  const [inputValue, setInputValue] = useState('');

  const addSkill = () => {
    const skill = inputValue.trim();
    if (skill && !data.includes(skill)) {
      onChange([...data, skill]);
      setInputValue('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(data.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Skills</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Add Skills</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type a skill and press Enter..."
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="hover:text-blue-600 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No skills added yet. Add skills like "JavaScript", "Project Management", etc.</p>
      )}
    </div>
  );
}

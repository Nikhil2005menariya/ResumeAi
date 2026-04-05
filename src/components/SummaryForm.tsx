interface SummaryFormProps {
  data: string;
  onChange: (data: string) => void;
}

export function SummaryForm({ data, onChange }: SummaryFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Professional Summary</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Brief summary of your experience and goals
        </label>
        <textarea
          value={data}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Experienced software engineer with 5+ years of experience in building scalable web applications..."
        />
        <p className="text-xs text-gray-500 mt-1">{data.length}/500 characters</p>
      </div>
    </div>
  );
}

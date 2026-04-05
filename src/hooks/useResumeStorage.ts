import { useState, useEffect } from 'react';
import type { ResumeData } from '../types/resume';
import { emptyResumeData } from '../types/resume';

const STORAGE_KEY = 'resumeMaker_data';

export function useResumeStorage() {
  const [data, setData] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved resume data:', e);
    }
    return emptyResumeData;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save resume data:', e);
    }
  }, [data]);

  const clearData = () => {
    setData(emptyResumeData);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { data, setData, clearData };
}

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { Project, Dataset, GenerationJob } from '../lib/supabase';

interface AppState {
  // Auth state
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  
  // Project state
  currentProject: Project | null;
  projects: Project[];
  
  // Data state
  datasets: Dataset[];
  currentDataset: Dataset | null;
  
  // Generation state
  generationJobs: GenerationJob[];
  isGenerating: boolean;
  generationProgress: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setGuest: (isGuest: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setDatasets: (datasets: Dataset[]) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  addDataset: (dataset: Dataset) => void;
  setGenerationJobs: (jobs: GenerationJob[]) => void;
  addGenerationJob: (job: GenerationJob) => void;
  updateGenerationJob: (id: string, updates: Partial<GenerationJob>) => void;
  setGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  isGuest: false,
  isLoading: true,
  currentProject: null,
  projects: [],
  datasets: [],
  currentDataset: null,
  generationJobs: [],
  isGenerating: false,
  generationProgress: 0,

  // Actions
  setUser: (user) => set({ user }),
  setGuest: (isGuest) => set({ isGuest }),
  setLoading: (isLoading) => set({ isLoading }),
  
  setCurrentProject: (currentProject) => set({ currentProject }),
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ 
    projects: [...state.projects, project] 
  })),
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  
  setDatasets: (datasets) => set({ datasets }),
  setCurrentDataset: (currentDataset) => set({ currentDataset }),
  addDataset: (dataset) => set((state) => ({ 
    datasets: [...state.datasets, dataset] 
  })),
  
  setGenerationJobs: (generationJobs) => set({ generationJobs }),
  addGenerationJob: (job) => set((state) => ({ 
    generationJobs: [...state.generationJobs, job] 
  })),
  updateGenerationJob: (id, updates) => set((state) => ({
    generationJobs: state.generationJobs.map(j => j.id === id ? { ...j, ...updates } : j)
  })),
  
  setGenerating: (isGenerating) => set({ isGenerating }),
  setGenerationProgress: (generationProgress) => set({ generationProgress }),
}));
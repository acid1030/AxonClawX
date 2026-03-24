import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  specialty: string;
  soul: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentsState {
  agents: Agent[];
  selectedAgentId: string | null;
  isLoading: boolean;

  // Actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  selectAgent: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set) => ({
      agents: [],
      selectedAgentId: null,
      isLoading: false,

      setAgents: (agents) => set({ agents }),

      addAgent: (agent) =>
        set((state) => ({
          agents: [...state.agents, agent],
        })),

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id
              ? { ...agent, ...updates, updatedAt: new Date() }
              : agent
          ),
        })),

      deleteAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgentId:
            state.selectedAgentId === id ? null : state.selectedAgentId,
        })),

      selectAgent: (id) => set({ selectedAgentId: id }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'agents-storage',
    }
  )
);

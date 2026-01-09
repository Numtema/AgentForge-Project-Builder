export type AgentRole = 'PO' | 'ARCHITECT' | 'TECH_LEAD' | 'WRITER' | 'QA';

export interface Agent {
  id: AgentRole;
  name: string;
  description: string;
  color: string;
}

export type ArtifactStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface Artifact {
  id: string;
  role: AgentRole;
  title: string;
  filename: string;
  content: string; // Markdown content
  status: ArtifactStatus;
  timestamp: number;
}

export interface Session {
  id: string;
  prompt: string;
  artifacts: Artifact[];
  createdAt: number;
}

export interface AppState {
  sessions: Session[];
  activeSessionId: string | null;
  isProcessing: boolean;
  drawerOpen: boolean;
  selectedArtifactId: string | null;
}

export const AGENTS: Record<AgentRole, Agent> = {
  PO: { 
    id: 'PO', 
    name: 'Product Owner', 
    description: 'Defines requirements & scope', 
    color: 'text-indigo-400' 
  },
  ARCHITECT: { 
    id: 'ARCHITECT', 
    name: 'System Architect', 
    description: 'Designs structure & stack', 
    color: 'text-purple-400' 
  },
  TECH_LEAD: { 
    id: 'TECH_LEAD', 
    name: 'Tech Lead', 
    description: 'Specs & Data Models', 
    color: 'text-emerald-400' 
  },
  WRITER: { 
    id: 'WRITER', 
    name: 'Tech Writer', 
    description: 'Compiles README & API Docs', 
    color: 'text-amber-400' 
  },
  QA: {
    id: 'QA',
    name: 'Quality Assurance',
    description: 'Validates coherence',
    color: 'text-rose-400'
  }
};
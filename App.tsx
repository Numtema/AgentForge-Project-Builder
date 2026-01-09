import React, { useState, useRef, useEffect } from 'react';
import { AppState, Session, Artifact, AGENTS } from './types';
import { generateArtifactStream, createInitialArtifacts } from './services/agentForge';
import { ArrowRight, Sparkles, FolderDown, Layers, Bot, History } from 'lucide-react';
import DottedBackground from './components/DottedBackground';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import JSZip from 'jszip';
import { clsx } from 'clsx';

const INITIAL_STATE: AppState = {
  sessions: [],
  activeSessionId: null,
  isProcessing: false,
  drawerOpen: false,
  selectedArtifactId: null
};

function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll logic for session list would go here

  const handleStartProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isProcessing) return;

    const newSessionId = Date.now().toString();
    const newArtifacts = createInitialArtifacts(newSessionId);
    
    const newSession: Session = {
      id: newSessionId,
      prompt: input,
      artifacts: newArtifacts,
      createdAt: Date.now()
    };

    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      activeSessionId: newSessionId,
      isProcessing: true
    }));

    setInput('');

    // Trigger Agents Sequentially or Parallel
    // We'll do parallel for Flash UI speed feeling
    const agentPromises = newArtifacts.map(artifact => {
      return generateArtifactStream(
        artifact.role,
        newSession.prompt,
        (chunk) => {
          setState(prev => {
            const sessions = [...prev.sessions];
            const sessionIdx = sessions.findIndex(s => s.id === newSessionId);
            if (sessionIdx === -1) return prev;
            
            const artifactIdx = sessions[sessionIdx].artifacts.findIndex(a => a.id === artifact.id);
            if (artifactIdx === -1) return prev;

            // Append chunk for streaming effect
            const currentArtifact = sessions[sessionIdx].artifacts[artifactIdx];
            // If chunk implies full replacement (standard AI behavior usually sends full text or diffs, 
            // but generateContentStream sends appends. We append.)
            // NOTE: The simple implementation assumes chunk is appended text.
            
            sessions[sessionIdx].artifacts[artifactIdx] = {
              ...currentArtifact,
              content: currentArtifact.content + chunk,
              status: 'streaming'
            };
            
            return { ...prev, sessions };
          });
        }
      ).then(() => {
        setState(prev => {
          const sessions = [...prev.sessions];
          const sessionIdx = sessions.findIndex(s => s.id === newSessionId);
          if (sessionIdx === -1) return prev;
          
          const artifactIdx = sessions[sessionIdx].artifacts.findIndex(a => a.id === artifact.id);
          sessions[sessionIdx].artifacts[artifactIdx].status = 'complete';
          return { ...prev, sessions };
        });
      }).catch(() => {
        setState(prev => {
          const sessions = [...prev.sessions];
          const sessionIdx = sessions.findIndex(s => s.id === newSessionId);
          if (sessionIdx === -1) return prev;
          
          const artifactIdx = sessions[sessionIdx].artifacts.findIndex(a => a.id === artifact.id);
          sessions[sessionIdx].artifacts[artifactIdx].status = 'error';
          return { ...prev, sessions };
        });
      });
    });

    await Promise.all(agentPromises);
    setState(prev => ({ ...prev, isProcessing: false }));
  };

  const handleDownloadProject = async (session: Session) => {
    const zip = new JSZip();
    const folder = zip.folder("agent-forge-project");
    
    if (folder) {
      session.artifacts.forEach(art => {
        folder.file(art.filename, art.content);
      });
      folder.file(".project_meta.json", JSON.stringify({
        generatedAt: new Date().toISOString(),
        prompt: session.prompt,
        engine: "AgentForge v1"
      }, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
      
      // Use native download approach instead of file-saver to avoid ESM export issues
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.prompt.slice(0, 20).replace(/\s+/g, '_')}_docs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
  const selectedArtifact = activeSession?.artifacts.find(a => a.id === state.selectedArtifactId) || null;

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#09090b] text-white overflow-hidden">
      <DottedBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#09090b]/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Agent<span className="text-indigo-400">Forge</span></h1>
        </div>
        
        {/* Session Tabs (Mini) */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-md no-scrollbar">
          {state.sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setState(prev => ({ ...prev, activeSessionId: session.id }))}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                state.activeSessionId === session.id 
                  ? "bg-white/10 border-white/20 text-white" 
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              {session.prompt.slice(0, 15)}...
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <div className={`w-2 h-2 rounded-full ${state.isProcessing ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-xs font-medium text-zinc-400">
              {state.isProcessing ? 'Agents Working...' : 'System Ready'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-0 flex-1 overflow-hidden flex flex-col items-center justify-center p-6 md:p-10">
        
        {/* Welcome State */}
        {!activeSession && (
          <div className="text-center space-y-6 max-w-2xl animate-in fade-in zoom-in duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-4 border border-indigo-500/20">
              <Sparkles size={14} />
              AI Project Architect
            </div>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
              Build it <span className="italic font-serif text-indigo-400">Fast.</span>
            </h2>
            <p className="text-lg text-zinc-400 font-light leading-relaxed max-w-lg mx-auto">
              Describe your idea. Our multi-agent swarm will instantly generate your PRD, Architecture, and Documentation.
            </p>
          </div>
        )}

        {/* Artifact Grid */}
        {activeSession && (
          <div className="w-full max-w-7xl h-full flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{activeSession.prompt}</h2>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                   <span className="flex items-center gap-1"><Layers size={14}/> 4 Artifacts</span>
                   <span className="flex items-center gap-1"><History size={14}/> {new Date(activeSession.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <button 
                onClick={() => handleDownloadProject(activeSession)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-zinc-700 shadow-xl"
              >
                <FolderDown size={18} />
                <span>Export Project</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full overflow-y-auto pb-32 pr-2 custom-scrollbar">
              {activeSession.artifacts.map((artifact) => (
                <ArtifactCard 
                  key={artifact.id} 
                  artifact={artifact} 
                  isActive={state.selectedArtifactId === artifact.id}
                  onClick={() => {
                    setState(prev => ({ 
                      ...prev, 
                      selectedArtifactId: artifact.id, 
                      drawerOpen: true 
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Input Bar */}
      <div className="relative z-20 w-full max-w-3xl mx-auto mb-8 px-6">
        <form 
          onSubmit={handleStartProject}
          className={clsx(
            "relative flex items-center gap-4 p-2 pl-6 rounded-full border transition-all duration-300 shadow-2xl",
            state.isProcessing 
              ? "bg-zinc-900/50 border-indigo-500/30" 
              : "bg-zinc-900/90 border-white/10 hover:border-white/20 focus-within:border-indigo-500/50 focus-within:bg-black"
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={state.isProcessing ? "Agents are working..." : "E.g. A SaaS for drone delivery logistics..."}
            disabled={state.isProcessing}
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-zinc-600 text-white h-12"
          />
          <button
            type="submit"
            disabled={!input.trim() || state.isProcessing}
            className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
              input.trim() && !state.isProcessing
                ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-lg shadow-indigo-500/25"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {state.isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </form>
      </div>

      <SideDrawer 
        artifact={selectedArtifact}
        isOpen={state.drawerOpen}
        onClose={() => setState(prev => ({ ...prev, drawerOpen: false }))}
      />
    </div>
  );
}

export default App;
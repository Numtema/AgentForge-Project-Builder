import React, { useEffect, useRef } from 'react';
import { Artifact, AGENTS } from '../types';
import { FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ArtifactCardProps {
  artifact: Artifact;
  onClick: () => void;
  isActive: boolean;
}

const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact, onClick, isActive }) => {
  const agent = AGENTS[artifact.role];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (artifact.status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [artifact.content, artifact.status]);

  return (
    <div 
      onClick={onClick}
      className={clsx(
        "group relative flex flex-col h-[320px] rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
        isActive 
          ? "border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)] scale-[1.02]" 
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={clsx("p-2 rounded-lg bg-white/5", agent.color)}>
            <FileText size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-none mb-1">{artifact.filename}</h3>
            <span className={clsx("text-xs font-medium opacity-80", agent.color)}>{agent.name}</span>
          </div>
        </div>
        <div className="text-white/40">
          {artifact.status === 'streaming' && <Loader2 size={16} className="animate-spin text-indigo-400" />}
          {artifact.status === 'complete' && <CheckCircle2 size={16} className="text-emerald-400" />}
          {artifact.status === 'error' && <AlertCircle size={16} className="text-rose-400" />}
        </div>
      </div>

      {/* Content Preview */}
      <div 
        ref={scrollRef}
        className="flex-1 p-5 overflow-hidden relative font-mono text-[10px] text-zinc-400 leading-relaxed opacity-80"
      >
        <div className="prose prose-invert prose-sm max-w-none">
           {artifact.content ? (
             <div className="whitespace-pre-wrap">{artifact.content.slice(0, 500) + (artifact.content.length > 500 ? '...' : '')}</div>
           ) : (
             <span className="italic opacity-50">Waiting for agent...</span>
           )}
        </div>
        
        {/* Gradient Fade at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#18181b] to-transparent pointer-events-none" />
      </div>

      {/* Hover Action */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
        <span className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-lg">
          View Details
        </span>
      </div>
    </div>
  );
};

export default ArtifactCard;
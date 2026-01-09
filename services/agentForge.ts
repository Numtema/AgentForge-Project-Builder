import { GoogleGenAI } from "@google/genai";
import { AgentRole, Artifact } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System prompts for each specialized agent
const PROMPTS: Record<AgentRole, (context: string) => string> = {
  PO: (context) => `
    You are an expert Product Owner. Analyze the following project idea: "${context}".
    Output a professional **Product Requirements Document (PRD)** in Markdown.
    Structure:
    - Executive Summary
    - User Personas
    - User Stories (Functional Requirements)
    - Non-Functional Requirements
    - KPIs
    Do not acknowledge, just output the Markdown.
  `,
  ARCHITECT: (context) => `
    You are a Senior System Architect. Based on the project idea "${context}",
    design the technical architecture in Markdown.
    Structure:
    - High-Level Architecture Diagram (Use Mermaid.js syntax inside \`\`\`mermaid blocks)
    - Tech Stack Selection (Frontend, Backend, Database, Infrastructure) with justifications.
    - Data Flow description.
    - Security considerations.
  `,
  TECH_LEAD: (context) => `
    You are a Technical Lead. Based on the idea "${context}", provide implementation specifics in Markdown.
    Structure:
    - Database Schema (ERD in Mermaid or text tables).
    - API Endpoints (REST or GraphQL specs).
    - Directory Structure (File tree).
    - Key Algorithms or Logic needed.
  `,
  WRITER: (context) => `
    You are a Technical Writer. Create a comprehensive **README.md** for "${context}".
    Structure:
    - Project Title & Description
    - Getting Started (Installation)
    - Configuration (.env)
    - Usage Examples
    - Contributing Guidelines.
    Make it look like a production-ready GitHub README.
  `,
  QA: (context) => `
    You are a QA Engineer. Review the project concept "${context}".
    Create a **Test Strategy** document in Markdown.
    Structure:
    - Testing Scope (Unit, Integration, E2E).
    - Edge Cases to consider.
    - Performance Testing plan.
    - Acceptance Criteria.
  `
};

export const generateArtifactStream = async (
  role: AgentRole, 
  projectContext: string,
  onChunk: (chunk: string) => void
) => {
  try {
    const prompt = PROMPTS[role](projectContext);
    
    // Gemini 3 Flash is recommended for speed and efficiency
    // Fix: Removed maxOutputTokens as per guidelines to avoid conflicts with thinking budget
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.4
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error(`Agent ${role} failed:`, error);
    onChunk("\n\n**[System Error]: Agent failed to generate content.**");
    throw error;
  }
};

export const createInitialArtifacts = (sessionId: string): Artifact[] => {
  const timestamp = Date.now();
  return [
    { id: `${sessionId}_prd`, role: 'PO', title: 'PRD.md', filename: 'PRD.md', content: '', status: 'pending', timestamp },
    { id: `${sessionId}_arch`, role: 'ARCHITECT', title: 'Architecture.md', filename: 'ARCHITECTURE.md', content: '', status: 'pending', timestamp },
    { id: `${sessionId}_tech`, role: 'TECH_LEAD', title: 'TechSpecs.md', filename: 'TECH_SPECS.md', content: '', status: 'pending', timestamp },
    { id: `${sessionId}_readme`, role: 'WRITER', title: 'README.md', filename: 'README.md', content: '', status: 'pending', timestamp }
  ];
};
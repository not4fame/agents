// frontend/admin-panel/src/lib/models/agentModels.ts
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is installed

export interface ShortTermMemory {
  sessionId: string;
  history: Array<Record<string, any>>; // e.g., list of user/assistant messages
  currentTaskData: Record<string, any>;
  scratchpad: Record<string, any>; // For temporary calculations or notes
}

export function createDefaultSTM(): ShortTermMemory {
  return {
    sessionId: uuidv4(),
    history: [],
    currentTaskData: {},
    scratchpad: {},
  };
}

export interface LongTermMemory {
  knowledgeBase: Record<string, any>; // General knowledge, facts
  learnedRules: Array<Record<string, any>>; // Rules derived from retrospection (will use Rule model from taskModels)
  pastProjectIterations: Array<Record<string, any>>; // Summaries or key learnings from past iterations
}

export function createDefaultLTM(): LongTermMemory {
  return {
    knowledgeBase: {},
    learnedRules: [],
    pastProjectIterations: [],
  };
}

export interface AgentConfig {
  // Configuration specific to the agent type
  // Example:
  // preferredLanguage?: string;
  // maxIterations?: number;
  [key: string]: any; // Allow arbitrary config values
}

export interface AbstractAgentState {
  id: string;
  name: string;
  role: string;
  stm: ShortTermMemory;
  ltm: LongTermMemory;
  config: AgentConfig;
}

// frontend/admin-panel/src/lib/models/taskModels.ts
import { v4 as uuidv4 } from 'uuid';

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface SubTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  assignedAgentId?: string | null;
  results: Record<string, any>;
  dependencies: string[];
  effort: number;
}

export function createDefaultSubTask(name: string, description: string, dependencies: string[] = [], effort: number = 1): SubTask {
    return {
        id: `subtask_${uuidv4()}`,
        name,
        description,
        status: TaskStatus.PENDING,
        results: {},
        dependencies,
        effort,
    };
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  acceptanceCriteria: string[];
  relatedSubtaskIds: string[];
}

export function createDefaultGoal(description: string, priority: number = 1): Goal {
    return {
        id: `goal_${uuidv4()}`,
        description,
        priority,
        acceptanceCriteria: [],
        relatedSubtaskIds: [],
    };
}

export interface Rule {
  id: string;
  description: string;
  context: string; // e.g., "planning", "agent_evaluation", "efficiency"
  actionableGuideline: string;
  source: string; // e.g., "retrospection_analysis", "user_defined"
  validationCount: number;
  lastValidatedAt?: string | null; // Timestamp as string
}

export function createDefaultRule(description: string, context: string, actionableGuideline: string, source: string): Rule {
    return {
        id: `rule_${uuidv4()}`,
        description,
        context,
        actionableGuideline,
        source,
        validationCount: 0,
    };
}

export interface MainTask {
  id: string;
  userQuery: string; // Original user request
  overallGoal: Goal;
  subTasks: SubTask[];
  designatedAgentIds: string[];
  status: TaskStatus;
  sessionStmSnapshot: Record<string, any>; // Manager's STM snapshot at initiation
  appliedRules: Rule[]; // Rules applied or considered for this task
  finalResults: Record<string, any>;
}

export function createDefaultMainTask(userQuery: string, overallGoal: Goal, designatedAgentIds: string[] = []): MainTask {
    return {
        id: `maintask_${uuidv4()}`,
        userQuery,
        overallGoal,
        subTasks: [],
        designatedAgentIds,
        status: TaskStatus.PENDING,
        sessionStmSnapshot: {},
        appliedRules: [],
        finalResults: {},
    };
}

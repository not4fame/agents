// frontend/admin-panel/src/lib/agents/ManagerAgentTS.ts
import { AbstractAgentTS } from './AbstractAgentTS';
import type { AbstractAgentState } from '../models/agentModels';
import { 
    MainTask, 
    SubTask, 
    Goal, // Added Goal for createDefaultGoal
    Rule, 
    TaskStatus,
    createDefaultMainTask,
    createDefaultSubTask,
    createDefaultRule,
    createDefaultGoal // Added createDefaultGoal
} from '../models/taskModels'; 
import { v4 as uuidv4 } from 'uuid'; // Not used here directly, but good for consistency if needed
import { ElasticsearchServiceTS } from '../services/elasticsearchService';

export class ManagerAgentTS extends AbstractAgentTS {
  currentMainTaskId?: string | null;

  constructor(initialState?: Partial<AbstractAgentState>, esServiceInstance?: ElasticsearchServiceTS) {
    super({ ...initialState, role: initialState?.role || "Manager" }, esServiceInstance);
    this.name = initialState?.name || "Manager Agent";
    // Attempt to load currentMainTaskId from the initial state's STM
    if (initialState?.stm?.currentTaskData?.activeMainTask?.id) {
        this.currentMainTaskId = initialState.stm.currentTaskData.activeMainTask.id;
    } else {
        this.currentMainTaskId = null;
    }
  }

  private _getMainTaskFromSTM(): MainTask | null {
    if (this.currentMainTaskId && this.stm.currentTaskData['activeMainTask']) {
      const taskData = this.stm.currentTaskData['activeMainTask'] as MainTask; // Cast to MainTask
      if (taskData.id === this.currentMainTaskId) {
        return taskData; // Return the plain object from STM
      }
    }
    return null;
  }

  private _saveMainTaskToSTM(mainTask: MainTask): void {
    this.stm.currentTaskData['activeMainTask'] = mainTask; 
    this.currentMainTaskId = mainTask.id;
  }
  
  public getCurrentMainTask(): MainTask | null {
      return this._getMainTaskFromSTM();
  }

  initiateMainTask(userQuery: string, designatedAgentIds: string[], overallGoalDesc: string): MainTask {
    console.log(`Manager Agent ${this.name}: Initiating MainTask for query "${userQuery}"`);
    const goal = createDefaultGoal(overallGoalDesc); // Use factory
    const mainTask = createDefaultMainTask(userQuery, goal, designatedAgentIds);
    mainTask.sessionStmSnapshot = { ...this.stm }; 

    this._saveMainTaskToSTM(mainTask);
    console.log(`MainTask ${mainTask.id} initiated and saved to STM.`);
    this.saveState(); // Manager state (STM with main task) changed
    return mainTask;
  }

  async planSubtasks(): Promise<SubTask[] | null> { // Made async to align with potential saveState
    const mainTask = this._getMainTaskFromSTM();
    if (!mainTask) {
      console.error(`Manager Agent ${this.name}: No active MainTask to plan for.`);
      return null;
    }
    console.log(`Manager Agent ${this.name}: Planning subtasks for MainTask ${mainTask.id}`);
    
    const subtask1 = createDefaultSubTask("Subtask 1 for " + mainTask.userQuery, "Description for subtask 1");
    const subtask2 = createDefaultSubTask("Subtask 2 for " + mainTask.userQuery, "Description for subtask 2", [subtask1.id]);
    mainTask.subTasks = [subtask1, subtask2];
    mainTask.status = TaskStatus.IN_PROGRESS;
    
    this._saveMainTaskToSTM(mainTask);
    await this.saveState(); // STM (main task) changed
    return mainTask.subTasks;
  }
  
  getNextExecutableGroup(): SubTask[] { // This method itself doesn't need to be async
    const mainTask = this._getMainTaskFromSTM();
    if (!mainTask) return [];

    console.log(`Manager Agent ${this.name}: Getting next executable group for MainTask ${mainTask.id}`);
    const pending = mainTask.subTasks.filter(st => st.status === TaskStatus.PENDING);
    if (pending.length > 0) {
        for (const subtask of pending) {
            if (!subtask.dependencies || subtask.dependencies.length === 0) {
                return [subtask];
            }
            const depsMet = subtask.dependencies.every(depId => 
                mainTask.subTasks.find(st => st.id === depId)?.status === TaskStatus.COMPLETED
            );
            if (depsMet) return [subtask];
        }
    }
    return [];
  }

  async executeSubtaskGroup(group: SubTask[]): Promise<void> { // Made async
    const mainTask = this._getMainTaskFromSTM();
    if (!mainTask) {
        console.error("No main task found for execution.");
        return;
    }
    console.log(`Manager Agent ${this.name}: Executing subtask group for MainTask ${mainTask.id}:`, group.map(g => g.name));
    let stateChanged = false;
    for (const subtask of group) {
      const taskInMain = mainTask.subTasks.find(st => st.id === subtask.id);
      if (taskInMain) {
        taskInMain.status = TaskStatus.COMPLETED; 
        taskInMain.results = { output: `Mock output for ${taskInMain.name}` };
        stateChanged = true;
      }
    }
    if (stateChanged) {
        const allSubtasksCompleted = mainTask.subTasks.every(st => st.status === TaskStatus.COMPLETED);
        if (allSubtasksCompleted && mainTask.subTasks.length > 0) {
            mainTask.status = TaskStatus.COMPLETED;
            mainTask.finalResults = { summary: "All subtasks completed successfully (mock)." };
        }
        this._saveMainTaskToSTM(mainTask);
        await this.saveState(); // STM (main task) changed
    }
  }

  async retrospect(completedGroup: SubTask[]): Promise<void> { // Made async
    const mainTask = this._getMainTaskFromSTM();
    if (!mainTask) {
        console.error("No main task found for retrospection.");
        return;
    }
    console.log(`Manager Agent ${this.name}: Retrospection for MainTask ${mainTask.id} on group:`, completedGroup.map(g => g.name));
    const newRule = createDefaultRule(
        `Learned from ${mainTask.id} completing '${completedGroup.map(s=>s.name).join(', ')}'`, 
        "retrospection", 
        "Mock guideline from retrospection", 
        `retrospection_${mainTask.id}`
    );
    this.ltm.learnedRules.push(newRule); 
    mainTask.appliedRules.push(newRule); 
    
    this._saveMainTaskToSTM(mainTask); 
    await this.saveState(); // LTM and STM (main task) changed
  }

  async revalidateRules(): Promise<void> { // Made async
    console.log(`Manager Agent ${this.name}: Revalidating rules.`);
    if (this.ltm.learnedRules.length === 0) {
        await this.saveState(); // Save state even if no rules, in case other parts of LTM/STM changed
        return;
    }

    this.ltm.learnedRules.forEach(rule => {
      rule.validationCount = (rule.validationCount || 0) + 1;
      rule.lastValidatedAt = new Date().toISOString();
    });
    await this.saveState(); // LTM changed
  }
}

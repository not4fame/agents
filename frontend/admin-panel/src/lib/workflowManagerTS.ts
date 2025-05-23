// frontend/admin-panel/src/lib/workflowManagerTS.ts
import { ManagerAgentTS } from './agents/ManagerAgentTS';
import { MainTask, TaskStatus, SubTask } from './models/taskModels'; 

export interface MainTaskFinalResults {
    mainTaskId: string;
    status: TaskStatus;
    iterations: number;
    finalResults?: Record<string, any>;
    subtasks: SubTask[];
    learnedRulesCount: number;
}

export class WorkflowManagerTS {
  private managerAgent: ManagerAgentTS;

  constructor(managerAgent: ManagerAgentTS) {
    this.managerAgent = managerAgent;
  }

  async runMainTaskLoop(userQuery: string, designatedAgentIds: string[], overallGoalDesc: string): Promise<MainTaskFinalResults> {
    console.log(`WorkflowManagerTS: Starting Main Task Loop for query "${userQuery}"`);

    // Initiate main task - this also saves the manager's state (including the new main task in STM)
    this.managerAgent.initiateMainTask(userQuery, designatedAgentIds, overallGoalDesc);
    let mainTask = this.managerAgent.getCurrentMainTask(); 
    
    if (!mainTask) {
        // This should not happen if initiateMainTask is successful and sets it in STM
        console.error("Critical Error: Main task not initiated or not found in STM immediately after initiation.");
        return { // Return an error structure
            mainTaskId: "ERROR_NO_MAIN_TASK",
            status: TaskStatus.FAILED,
            iterations: 0,
            finalResults: { error: "Main task could not be initiated." },
            subtasks: [],
            learnedRulesCount: this.managerAgent.ltm.learnedRules.length,
        };
    }
    
    let iterations = 0;
    const maxIterations = 10; // Safety break

    while (mainTask.status !== TaskStatus.COMPLETED && mainTask.status !== TaskStatus.FAILED && iterations < maxIterations) {
      iterations++;
      console.log(`Workflow Iteration: ${iterations} for MainTask ${mainTask.id}`);

      // 1. Plan/Re-plan
      // planSubtasks modifies mainTask in manager's STM and saves state
      if (mainTask.subTasks.length === 0 || iterations > 1) { 
        await this.managerAgent.planSubtasks(); 
        mainTask = this.managerAgent.getCurrentMainTask(); // Re-fetch from STM
        if (!mainTask) {
             console.error("Critical Error: Main task disappeared from STM after planning.");
             // Attempt to load manager state to see if it gives a clue or restores STM
             await this.managerAgent.loadState(); 
             mainTask = this.managerAgent.getCurrentMainTask();
             if (!mainTask) { // Still no main task
                return { mainTaskId: "ERROR_MAIN_TASK_LOST_POST_PLAN", status: TaskStatus.FAILED, iterations, subtasks: [], learnedRulesCount: this.managerAgent.ltm.learnedRules.length };
             }
        }
      }

      if (!mainTask.subTasks || mainTask.subTasks.length === 0) {
        mainTask.status = TaskStatus.FAILED; // Mark as failed
        console.error("Planning failed to produce subtasks for MainTask:", mainTask.id);
        await this.managerAgent.saveState(); // Save the FAILED status
        break; 
      }

      // 2. Get next executable group
      // getNextExecutableGroup reads from manager's STM
      const executableGroup = this.managerAgent.getNextExecutableGroup(); 
      
      if (executableGroup.length === 0) {
        const allSubtasksDone = mainTask.subTasks.every(st => st.status === TaskStatus.COMPLETED || st.status === TaskStatus.CANCELLED);
        if (allSubtasksDone && mainTask.subTasks.length > 0) { // Ensure there were subtasks to begin with
          mainTask.status = TaskStatus.COMPLETED;
          mainTask.finalResults = mainTask.finalResults || {}; // Ensure finalResults exists
          mainTask.finalResults['summary'] = mainTask.finalResults['summary'] || "All subtasks completed successfully.";
          await this.managerAgent.saveState(); // Save COMPLETED status
        } else {
          console.warn(`No executable group found for MainTask ${mainTask.id}, but not all tasks are completed. Current subtask statuses:`, mainTask.subTasks.map(st => ({id: st.id, status: st.status})));
          // If no progress can be made, consider it failed to avoid infinite loops
          // This might happen if there's a planning issue (e.g. circular dependencies not caught by simple getNextExecutableGroup)
          mainTask.status = TaskStatus.FAILED;
          mainTask.finalResults = mainTask.finalResults || {};
          mainTask.finalResults['error'] = "Workflow stuck: No executable subtasks found.";
          await this.managerAgent.saveState();
        }
        break; 
      }
      
      // 3. Execute group
      // executeSubtaskGroup modifies mainTask in manager's STM and saves state
      if (executableGroup.length > 0) {
        await this.managerAgent.executeSubtaskGroup(executableGroup);
        mainTask = this.managerAgent.getCurrentMainTask(); // Re-fetch
         if (!mainTask) {
            console.error("Critical Error: Main task disappeared from STM after execution.");
            return { mainTaskId: "ERROR_MAIN_TASK_LOST_POST_EXEC", status: TaskStatus.FAILED, iterations, subtasks: [], learnedRulesCount: this.managerAgent.ltm.learnedRules.length };
        }

        // 4. Retrospect on the just completed group
        // retrospect modifies LTM/STM and saves state
        const justCompleted = executableGroup.filter(stExecuted => 
            mainTask!.subTasks.find(mts => mts.id === stExecuted.id)?.status === TaskStatus.COMPLETED
        );
        if (justCompleted.length > 0) {
             await this.managerAgent.retrospect(justCompleted);
             mainTask = this.managerAgent.getCurrentMainTask(); // Re-fetch
             if (!mainTask) {
                console.error("Critical Error: Main task disappeared from STM after retrospection.");
                return { mainTaskId: "ERROR_MAIN_TASK_LOST_POST_RETRO", status: TaskStatus.FAILED, iterations, subtasks: [], learnedRulesCount: this.managerAgent.ltm.learnedRules.length };
            }
        }
      }
      
      // 5. Revalidate rules
      // revalidateRules modifies LTM and saves state
      await this.managerAgent.revalidateRules();
      mainTask = this.managerAgent.getCurrentMainTask(); // Re-fetch
      if (!mainTask) {
            console.error("Critical Error: Main task disappeared from STM after rule revalidation.");
            return { mainTaskId: "ERROR_MAIN_TASK_LOST_POST_RULES", status: TaskStatus.FAILED, iterations, subtasks: [], learnedRulesCount: this.managerAgent.ltm.learnedRules.length };
      }

      // Loop termination condition check (e.g. mainTask.status might have been set to COMPLETED by executeSubtaskGroup)
      if (mainTask.status === TaskStatus.COMPLETED || mainTask.status === TaskStatus.FAILED) {
          break;
      }
    } // End of while loop

    if (iterations >= maxIterations && mainTask.status !== TaskStatus.COMPLETED && mainTask.status !== TaskStatus.FAILED) {
        mainTask.status = TaskStatus.FAILED;
        mainTask.finalResults = mainTask.finalResults || {};
        mainTask.finalResults['error'] = `Main task loop reached max iterations (${maxIterations}).`;
        console.error(mainTask.finalResults['error']);
        await this.managerAgent.saveState(); // Save FAILED status
    }
    
    console.log(`WorkflowManagerTS: Main Task Loop finished for ${mainTask.id}. Final Status: ${mainTask.status}`);
    return {
        mainTaskId: mainTask.id,
        status: mainTask.status,
        iterations,
        finalResults: mainTask.finalResults,
        subtasks: mainTask.subTasks,
        learnedRulesCount: this.managerAgent.ltm.learnedRules.length,
    };
  }
}

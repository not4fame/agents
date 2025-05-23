# backend/app/workflow_manager.py
import time
import uuid
from typing import List
from app.agents.manager import ManagerAgent
from app.models.task import TaskStatus, SubTask

class WorkflowManager:
    def __init__(self, manager_agent: ManagerAgent):
        self.manager = manager_agent

    def run_main_task_loop(self, user_query: str, designated_agent_ids: List[str], overall_goal_desc: str) -> dict:
        print(f"--- Starting New Main Task Loop for Query: '{user_query}' ---")
        
        # 1. Initiate Main Task
        main_task = self.manager.initiate_main_task(
            user_query=user_query,
            designated_agent_ids=designated_agent_ids,
            overall_goal_desc=overall_goal_desc
        )
        print(f"MainTask '{main_task.id}' initiated by {self.manager.name} (ID: {self.manager.id}).")

        max_iterations = 10 # Safeguard against infinite loops
        current_iteration = 0

        while main_task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] and current_iteration < max_iterations:
            current_iteration += 1
            print(f"--- Iteration {current_iteration} for MainTask {main_task.id} ---")

            # 2. Plan/Re-plan Subtasks
            if not main_task.sub_tasks or current_iteration > 1: 
                print("Planning/Re-planning subtasks...")
                self.manager.plan_subtasks() 
                main_task = self.manager._get_main_task() 
                if not main_task or not main_task.sub_tasks:
                    print("Planning failed or produced no subtasks. Ending loop.")
                    # Ensure main_task is not None before accessing status
                    if main_task: 
                        main_task.status = TaskStatus.FAILED
                        self.manager._save_main_task(main_task)
                    else:
                        # This case should ideally not be reached if plan_subtasks guarantees a main_task or handles its absence.
                        # However, as a safeguard:
                        print("Error: Main task became None after planning attempt.")
                        # We cannot save the main_task if it's None, so we break.
                        # The status of the original main_task (if it existed before planning) might remain as is,
                        # or we might need a more robust way to fetch/update it.
                        # For now, the loop will break.
                        break 
                    break
            
            # 3. Get Next Synchronous Group of Subtasks
            executable_group = self.manager.get_next_executable_group()
            main_task = self.manager._get_main_task() # Re-fetch main_task
            
            # Ensure main_task is not None after _get_main_task()
            if not main_task:
                print("Error: Main task is None after trying to get the next executable group. Ending loop.")
                break


            if not executable_group:
                all_done = all(st.status == TaskStatus.COMPLETED for st in main_task.sub_tasks)
                if all_done:
                    print("All subtasks completed. Main task loop finishing.")
                    main_task.status = TaskStatus.COMPLETED
                    self.manager._save_main_task(main_task)
                    break 
                else:
                    print("No executable group found, but not all tasks are completed. Waiting or ending.")
                    if any(st.status == TaskStatus.IN_PROGRESS for st in main_task.sub_tasks):
                            print("Some tasks still in progress. This state should be brief in sync mock.")
                    else: 
                            print("No executable tasks and nothing in progress, but not all tasks complete. Possible deadlock or planning issue.")
                            main_task.status = TaskStatus.FAILED 
                            self.manager._save_main_task(main_task)
                    break 

            print(f"Next executable group: {[st.name for st in executable_group]}")

            # 4. Execute Subtask Group
            self.manager.execute_subtask_group(executable_group)
            main_task = self.manager._get_main_task() # Re-fetch after execution
            if not main_task: # Safeguard
                print("Error: Main task became None after executing subtask group. Ending loop.")
                break

            # The subtask_group list contains copies of subtasks.
            # We need to check status from the re-fetched main_task's subtasks.
            completed_group_ids = []
            for executed_st_data in executable_group: # executable_group contains Pydantic models
                # Find the corresponding subtask in the main_task (which is fresh from _get_main_task)
                # to check its actual status after execution.
                updated_subtask = next((st for st in main_task.sub_tasks if st.id == executed_st_data.id), None)
                if updated_subtask and updated_subtask.status == TaskStatus.COMPLETED:
                    completed_group_ids.append(updated_subtask.id)
            

            # 5. Retrospection (after each group)
            if completed_group_ids:
                print("Performing retrospection...")
                self.manager.retrospect(completed_group_ids)
                main_task = self.manager._get_main_task() # Re-fetch after retrospection
                if not main_task: # Safeguard
                    print("Error: Main task became None after retrospection. Ending loop.")
                    break
            
            # 6. Rule Revalidation
            print("Revalidating rules...")
            self.manager.revalidate_rules()
            main_task = self.manager._get_main_task() # Re-fetch after rule revalidation
            if not main_task: # Safeguard
                print("Error: Main task became None after rule revalidation. Ending loop.")
                break

            if main_task.status == TaskStatus.COMPLETED:
                print(f"MainTask {main_task.id} marked as COMPLETED during iteration.")
                break
        
        if main_task and current_iteration >= max_iterations: # Ensure main_task is not None
            print(f"Reached max iterations ({max_iterations}). Ending loop for MainTask {main_task.id}.")
            if main_task.status not in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
                main_task.status = TaskStatus.FAILED 
                self.manager._save_main_task(main_task)
        
        # Ensure main_task is not None before accessing its attributes for the final result
        if not main_task:
            print("--- Main Task Loop Finished for Query: '{user_query}'. Error: Main task became None. ---")
            return {
                "main_task_id": "N/A - Main task lost",
                "status": TaskStatus.FAILED,
                "iterations": current_iteration,
                "results": {"error": "Main task became None during execution"},
                "subtasks": [],
                "learned_rules_count": len(self.manager.ltm.learned_rules) if self.manager else 0
            }

        final_status = main_task.status
        print(f"--- Main Task Loop Finished for Query: '{user_query}'. Final Status: {final_status} ---")
        return {
            "main_task_id": main_task.id,
            "status": final_status,
            "iterations": current_iteration,
            "results": main_task.final_results,
            "subtasks": [st.model_dump() for st in main_task.sub_tasks],
            "learned_rules_count": len(self.manager.ltm.learned_rules)
        }

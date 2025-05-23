from .base import AbstractAgent, get_es_service
from pydantic import Field
from typing import List, Dict, Any, Optional
import uuid
from app.models.task import TaskStatus, SubTask, Goal, Rule, MainTask
from app.models.memory import ShortTermMemory # For type hinting if needed

class ManagerAgent(AbstractAgent):
    name: str = "Manager Agent"
    role: str = "Manager"
    
    current_main_task_id: Optional[str] = None
    # available_agents: List[str] = [] # List of agent IDs or names (can be part of config or discovered)

    def _get_main_task(self) -> Optional[MainTask]:
        # Helper to load the current MainTask from STM or LTM (if persisted)
        # For now, assume it's primarily in STM for an active session.
        if self.current_main_task_id and 'active_main_task' in self.stm.current_task_data:
            task_data = self.stm.current_task_data['active_main_task']
            if task_data.get('id') == self.current_main_task_id:
                return MainTask(**task_data)
        return None

    def _save_main_task(self, main_task: MainTask):
        self.stm.current_task_data['active_main_task'] = main_task.model_dump()
        self.current_main_task_id = main_task.id
        # Consider if MainTask itself should be an ES document or part of agent's LTM.
        # For now, primarily in STM during execution, and agent state save captures it.
        self.save_state()


    def initiate_main_task(self, user_query: str, designated_agent_ids: List[str], overall_goal_desc: str, goal_priority: int = 1) -> MainTask:
        goal = Goal(description=overall_goal_desc, priority=goal_priority)
        main_task = MainTask(
            user_query=user_query,
            overall_goal=goal,
            designated_agent_ids=designated_agent_ids,
            session_stm_snapshot=self.stm.model_dump() # Snapshot of manager's STM at initiation
        )
        self.current_main_task_id = main_task.id
        self._save_main_task(main_task)
        print(f"Manager Agent {self.name} initiated MainTask: {main_task.id} for query: '{user_query}'")
        return main_task

    def plan_subtasks(self) -> Optional[List[SubTask]]:
        main_task = self._get_main_task()
        if not main_task:
            print(f"Manager Agent {self.name}: No active MainTask to plan for.")
            return None

        print(f"Manager Agent {self.name}: Planning subtasks for MainTask {main_task.id} ('{main_task.user_query}')")
        
        # Mock planning logic:
        # Simple decomposition based on query words or predefined templates
        # This is where more sophisticated planning (e.g., using an LLM or planner agent) would go.
        
        subtasks = []
        if "feature x" in main_task.user_query.lower():
            subtasks.append(SubTask(name="Design Feature X", description="Detailed design for Feature X"))
            subtasks.append(SubTask(name="Implement Feature X", description="Write code for Feature X", dependencies=[subtasks[0].id if subtasks else ""]))
            subtasks.append(SubTask(name="Test Feature X", description="Test Feature X", dependencies=[subtasks[1].id if len(subtasks)>1 else ""]))
        elif "report" in main_task.user_query.lower():
            subtasks.append(SubTask(name="Gather Data", description="Collect all necessary data for the report"))
            subtasks.append(SubTask(name="Analyze Data", description="Analyze collected data", dependencies=[subtasks[0].id if subtasks else ""]))
            subtasks.append(SubTask(name="Generate Report", description="Compile and format the report", dependencies=[subtasks[1].id if len(subtasks)>1 else ""]))
        else:
            subtasks.append(SubTask(name="Generic Step 1", description="First general step for: " + main_task.user_query))
            subtasks.append(SubTask(name="Generic Step 2", description="Second general step", dependencies=[subtasks[0].id if subtasks else ""]))

        main_task.sub_tasks = subtasks
        main_task.status = TaskStatus.IN_PROGRESS # Assuming planning means it's now in progress
        self._save_main_task(main_task)
        
        print(f"Subtasks planned: {[st.name for st in main_task.sub_tasks]}")
        return main_task.sub_tasks

    def get_next_executable_group(self) -> List[SubTask]:
        main_task = self._get_main_task()
        if not main_task or not main_task.sub_tasks:
            return []

        executable_group = []
        pending_subtasks = [st for st in main_task.sub_tasks if st.status == TaskStatus.PENDING]
        
        for subtask in pending_subtasks:
            dependencies_met = True
            if subtask.dependencies:
                for dep_id in subtask.dependencies:
                    dep_task = next((st for st in main_task.sub_tasks if st.id == dep_id), None)
                    if not dep_task or dep_task.status != TaskStatus.COMPLETED:
                        dependencies_met = False
                        break
            if dependencies_met:
                executable_group.append(subtask)
        
        # For true synchronous groups, this logic might need to be more sophisticated
        # e.g., identifying all tasks that can run in parallel at the current stage.
        # This simple version just takes one task if its direct dependencies are met.
        # For this iteration, we'll just return the first one found that can be run.
        return executable_group[:1] if executable_group else []


    def execute_subtask_group(self, subtask_group: List[SubTask]):
        main_task = self._get_main_task()
        if not main_task or not subtask_group:
            print(f"Manager Agent {self.name}: No subtasks to execute or no active main task.")
            return

        print(f"Manager Agent {self.name}: Executing subtask group for MainTask {main_task.id}:")
        for subtask_to_execute in subtask_group:
            # Find the actual subtask instance in the main_task.sub_tasks list to update it
            task_in_main = next((st for st in main_task.sub_tasks if st.id == subtask_to_execute.id), None)
            if not task_in_main:
                print(f"  Error: Subtask {subtask_to_execute.id} not found in main task's list.")
                continue

            print(f"  Executing Subtask: {task_in_main.name} (ID: {task_in_main.id})")
            task_in_main.status = TaskStatus.IN_PROGRESS
            self._save_main_task(main_task) # Save state: task is in progress

            # Mock execution:
            # In a real system, this would involve:
            # 1. Selecting an appropriate agent (from main_task.designated_agent_ids or a pool).
            # 2. Formatting the subtask for that agent.
            # 3. Sending it to the agent (e.g., via an API call, message queue).
            # 4. Waiting for/receiving the results.
            # For now, we'll just simulate completion.
            print(f"    ... Subtask {task_in_main.name} (mock) execution in progress ...")
            task_in_main.results = {"mock_output": f"Successfully completed {task_in_main.name}", "status_message": "Mock execution successful"}
            task_in_main.status = TaskStatus.COMPLETED
            print(f"    ... Subtask {task_in_main.name} completed.")
            self._save_main_task(main_task) # Save state: task is completed
        
        # Check if all subtasks are completed
        all_completed = all(st.status == TaskStatus.COMPLETED for st in main_task.sub_tasks)
        if all_completed:
            main_task.status = TaskStatus.COMPLETED
            main_task.final_results = {"summary": "All subtasks completed successfully.", "outputs": [st.results for st in main_task.sub_tasks]}
            print(f"MainTask {main_task.id} completed successfully.")
        self._save_main_task(main_task)


    def retrospect(self, completed_group_ids: List[str]):
        main_task = self._get_main_task()
        if not main_task:
            print(f"Manager Agent {self.name}: No active MainTask for retrospection.")
            return

        print(f"Manager Agent {self.name}: Performing retrospection for MainTask {main_task.id} on completed group: {completed_group_ids}")
        
        completed_subtasks = [st for st in main_task.sub_tasks if st.id in completed_group_ids and st.status == TaskStatus.COMPLETED]

        if not completed_subtasks:
            print("  No completed subtasks found for retrospection in the given group.")
            return

        # Mock retrospection logic:
        # Analyze results, agent performance (if tracked), efficiency.
        # Propose rules.
        for subtask in completed_subtasks:
            print(f"  Analyzing subtask: {subtask.name} (Results: {subtask.results.get('status_message', 'N/A')})")
        
        # Example: Propose a generic rule based on this retrospection
        new_rule_desc = f"Review task outcomes if 'mock execution' is mentioned, for MainTask type: {main_task.user_query[:20]}"
        new_rule_guideline = "Ensure mock flags are removed before final production runs."
        
        # Check if a similar rule already exists to avoid duplicates
        rule_exists = any(r.description == new_rule_desc for r in self.ltm.learned_rules)

        if not rule_exists:
            proposed_rule = Rule(
                description=new_rule_desc,
                context="task_review",
                actionable_guideline=new_rule_guideline,
                source=f"retrospection_maintask_{main_task.id}"
            )
            self.ltm.learned_rules.append(proposed_rule) # Add to Long-Term Memory
            main_task.applied_rules.append(proposed_rule) # Also note it was applied/considered for this task
            print(f"  Proposed and added new rule: {proposed_rule.description}")
        else:
            print(f"  Rule similar to '{new_rule_desc}' already exists. Skipping addition.")

        self.stm.scratchpad['last_retrospection_summary'] = f"Retrospection on {len(completed_subtasks)} tasks. New rules proposed: {'Yes' if not rule_exists and completed_subtasks else 'No'}."
        self._save_main_task(main_task) # Save changes to main_task (e.g. applied_rules)
        self.save_state() # Save changes to agent's LTM (learned_rules)


    def revalidate_rules(self):
        main_task = self._get_main_task() # For context, if needed

        print(f"Manager Agent {self.name}: Revalidating rules.")
        if not self.ltm.learned_rules:
            print("  No rules in LTM to revalidate.")
            return

        for rule in self.ltm.learned_rules:
            # Mock revalidation logic:
            # - Check if rule is still relevant (e.g., based on recent task outcomes, new info).
            # - Could involve LLM evaluation or statistical checks.
            # - Update validation_count or modify/deprecate rule.
            print(f"  Revalidating rule ID {rule.id}: '{rule.description}' (Source: {rule.source})")
            if "mock execution" in rule.description.lower(): # Example condition
                rule.validation_count += 1
                rule.last_validated_at = str(uuid.uuid4()) # Simulate timestamp update
                print(f"    Rule '{rule.description}' deemed still relevant. Validation count: {rule.validation_count}")
            else:
                print(f"    Rule '{rule.description}' - no specific revalidation action taken in this mock.")
        
        # If main_task context is used for revalidation, save it
        if main_task:
            self._save_main_task(main_task)
        self.save_state() # Save changes to LTM rules

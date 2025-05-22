from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from enum import Enum

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class SubTask(BaseModel):
    id: str = Field(default_factory=lambda: "subtask_" + str(uuid.uuid4()))
    name: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent_id: Optional[str] = None
    # Results or outputs from this subtask
    results: Dict[str, Any] = {} 
    # Dependencies: list of subtask IDs that must be completed before this one
    dependencies: List[str] = [] 
    # Estimated effort or complexity
    effort: int = 1 

class Goal(BaseModel):
    id: str = Field(default_factory=lambda: "goal_" + str(uuid.uuid4()))
    description: str
    # How important this goal is, could be numeric or descriptive
    priority: int = 1 
    # Criteria to determine if the goal is met
    acceptance_criteria: List[str] = []
    # Related sub-tasks that contribute to this goal
    related_subtask_ids: List[str] = []

class Rule(BaseModel):
    id: str = Field(default_factory=lambda: "rule_" + str(uuid.uuid4()))
    description: str
    # Context where the rule applies (e.g., "planning", "agent_evaluation", "efficiency")
    context: str 
    # Action or guideline the rule suggests
    actionable_guideline: str
    # How this rule was derived (e.g., "retrospection_analysis", "user_defined")
    source: str 
    # Counter for how many times this rule has been validated or found useful
    validation_count: int = 0
    last_validated_at: Optional[str] = None # Timestamp as string

class MainTask(BaseModel):
    id: str = Field(default_factory=lambda: "maintask_" + str(uuid.uuid4()))
    user_query: str # Original user request
    overall_goal: Goal
    # Decomposed plan into subtasks
    sub_tasks: List[SubTask] = [] 
    # Agents designated for this main task (IDs or names)
    designated_agent_ids: List[str] = []
    # Current status of the overall task
    status: TaskStatus = TaskStatus.PENDING
    # Short term memory context relevant to this task execution
    session_stm_snapshot: Dict[str, Any] = {}
    # Relevant rules applied or considered for this task
    applied_rules: List[Rule] = []
    # Results of the main task execution
    final_results: Dict[str, Any] = {}

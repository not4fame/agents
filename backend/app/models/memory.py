from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uuid

class ShortTermMemory(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    history: List[Dict[str, Any]] = [] # e.g., list of user/assistant messages
    current_task_data: Dict[str, Any] = {}
    scratchpad: Dict[str, Any] = {} # For temporary calculations or notes

class LongTermMemory(BaseModel):
    knowledge_base: Dict[str, Any] = {} # General knowledge, facts
    learned_rules: List[Dict[str, Any]] = [] # Rules derived from retrospection
    past_project_iterations: List[Dict[str, Any]] = [] # Summaries or key learnings from past iterations

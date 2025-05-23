from pydantic import BaseModel, Field
import uuid
from typing import Optional, Dict, Any
from app.models.memory import ShortTermMemory, LongTermMemory
# Ensure this import path is correct based on your structure
from app.services.elasticsearch_service import ElasticsearchService 

# Global ES service instance, or inject it. For simplicity here, global.
# Consider dependency injection for better testability.
_es_service_instance = None

def get_es_service():
    global _es_service_instance
    if _es_service_instance is None:
        _es_service_instance = ElasticsearchService()
    return _es_service_instance

class AbstractAgent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Unnamed Agent"
    role: str = "Generic Agent"
    stm: ShortTermMemory = Field(default_factory=ShortTermMemory)
    ltm: LongTermMemory = Field(default_factory=LongTermMemory)
    config: Dict[str, Any] = {}

    def load_state(self, agent_id: Optional[str] = None) -> bool:
        target_id = agent_id if agent_id else self.id
        es_service = get_es_service()
        if not es_service or not es_service.client:
            print(f"Elasticsearch service not available. Cannot load state for agent {target_id}.")
            return False
        
        print(f"Attempting to load state for agent {target_id}...")
        agent_data = es_service.get_agent(target_id)
        if agent_data:
            self.id = agent_data.get('id', self.id) # agent_data['id'] is from agent_id field in ES
            self.name = agent_data.get('name', self.name)
            self.role = agent_data.get('role', self.role)
            self.config = agent_data.get('config', self.config)
            
            # Deserialize STM and LTM if they are dicts from Elasticsearch
            stm_data = agent_data.get('stm')
            if stm_data and isinstance(stm_data, dict):
                self.stm = ShortTermMemory(**stm_data)
            elif stm_data: # if it's already a Pydantic model (e.g., if not from full ES load)
                self.stm = stm_data

            ltm_data = agent_data.get('ltm')
            if ltm_data and isinstance(ltm_data, dict):
                self.ltm = LongTermMemory(**ltm_data)
            elif ltm_data:
                self.ltm = ltm_data
                
            print(f"State for agent {self.id} ({self.name}) loaded successfully from Elasticsearch.")
            return True
        else:
            print(f"No state found in Elasticsearch for agent {target_id}. Agent will use default/current state.")
            return False

    def save_state(self) -> bool:
        es_service = get_es_service()
        if not es_service or not es_service.client:
            print(f"Elasticsearch service not available. Cannot save state for agent {self.id}.")
            return False

        print(f"Attempting to save state for agent {self.id} ({self.name})...")
        # The ElasticsearchService's save_agent method expects a Pydantic model
        # that matches AbstractAgentPydantic, which self already is.
        if es_service.save_agent(self): # Pass the current instance
            print(f"State for agent {self.id} ({self.name}) saved to Elasticsearch.")
            return True
        else:
            print(f"Failed to save state for agent {self.id} ({self.name}) to Elasticsearch.")
            return False

    def process_message(self, message: str) -> str:
        self.stm.history.append({"role": "user", "content": message})
        response = f"Agent {self.name} ({self.id}) received: {message}"
        self.stm.history.append({"role": "assistant", "content": response})
        self.save_state() # Example: save state after processing a message
        return response

    class Config:
        arbitrary_types_allowed = True

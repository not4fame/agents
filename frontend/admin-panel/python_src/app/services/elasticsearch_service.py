from elasticsearch import Elasticsearch
from elasticsearch_dsl import Document, Text, Keyword, Object, connections, InnerDoc
from elasticsearch.helpers import bulk
from pydantic import BaseModel
import os
from typing import Dict, Any, List
from app.models.memory import ShortTermMemory, LongTermMemory # Assuming these are Pydantic models

# Get Elasticsearch host from environment variable
ELASTICSEARCH_HOST = os.getenv("ELASTICSEARCH_HOST", "http://localhost:9200")
AGENT_INDEX_NAME = "agents_index"

# --- Pydantic to Elasticsearch-DSL InnerDocs ---
# We need to represent Pydantic models as InnerDocs for embedding in the AgentDocument
# This requires a bit of dynamic creation or explicit definition if structures are fixed.

class STMDocument(InnerDoc):
    session_id = Keyword()
    history = Object(enabled=False) # Can be complex, store as generic object
    current_task_data = Object(enabled=False)
    scratchpad = Object(enabled=False)

    @classmethod
    def from_pydantic(cls, model: ShortTermMemory):
        return cls(**model.model_dump())

    def to_pydantic(self) -> ShortTermMemory:
        return ShortTermMemory(**self.to_dict())


class LTMDocument(InnerDoc):
    knowledge_base = Object(enabled=False)
    learned_rules = Object(enabled=False) # List of dicts
    past_project_iterations = Object(enabled=False) # List of dicts

    @classmethod
    def from_pydantic(cls, model: LongTermMemory):
        return cls(**model.model_dump())

    def to_pydantic(self) -> LongTermMemory:
        return LongTermMemory(**self.to_dict())


class AgentDocument(Document):
    agent_id = Keyword(required=True) # Using 'agent_id' as the document ID
    name = Text(fields={'keyword': Keyword()})
    role = Keyword()
    config = Object(enabled=False) 
    stm = Object(STMDocument)
    ltm = Object(LTMDocument)

    class Index:
        name = AGENT_INDEX_NAME
        settings = {
            "number_of_shards": 1,
            "number_of_replicas": 0
        }

    def save(self, **kwargs):
        # Use agent_id as the _id for the document
        self.meta.id = self.agent_id 
        return super().save(**kwargs)

    @classmethod
    def from_pydantic(cls, agent_model: 'AbstractAgentPydantic'): # Forward reference for AbstractAgent
        # This method is illustrative; AbstractAgent itself is not a Document.
        # It's more about how an instance of AbstractAgent gets stored.
        doc = cls(
            agent_id=agent_model.id,
            name=agent_model.name,
            role=agent_model.role,
            config=agent_model.config,
            stm=STMDocument.from_pydantic(agent_model.stm),
            ltm=LTMDocument.from_pydantic(agent_model.ltm)
        )
        return doc


class ElasticsearchService:
    def __init__(self, host: str = ELASTICSEARCH_HOST):
        try:
            self.client = Elasticsearch(host, timeout=30, max_retries=3, retry_on_timeout=True)
            if not self.client.ping():
                raise ConnectionError("Failed to connect to Elasticsearch")
            connections.create_connection(alias='default', hosts=[host])
            self._ensure_index_exists()
            print(f"Successfully connected to Elasticsearch at {host} and index '{AGENT_INDEX_NAME}' is ready.")
        except ConnectionError as e:
            print(f"Elasticsearch connection error: {e}")
            self.client = None # Indicate connection failure
        except Exception as e:
            print(f"An unexpected error occurred during Elasticsearch initialization: {e}")
            self.client = None


    def _ensure_index_exists(self):
        if self.client and not self.client.indices.exists(index=AGENT_INDEX_NAME):
            try:
                AgentDocument.init()
                print(f"Index '{AGENT_INDEX_NAME}' created successfully.")
            except Exception as e:
                print(f"Error creating index '{AGENT_INDEX_NAME}': {e}")
                # Potentially raise or handle more gracefully
                raise

    def save_agent(self, agent_model: 'AbstractAgentPydantic') -> bool:
        if not self.client:
            print("Elasticsearch client not available. Cannot save agent.")
            return False
        try:
            agent_doc = AgentDocument(
                agent_id=agent_model.id,
                name=agent_model.name,
                role=agent_model.role,
                config=agent_model.config,
                stm=STMDocument.from_pydantic(agent_model.stm),
                ltm=LTMDocument.from_pydantic(agent_model.ltm)
            )
            agent_doc.meta.id = agent_model.id # Explicitly set document ID
            agent_doc.save()
            print(f"Agent {agent_model.id} ({agent_model.name}) saved/updated successfully.")
            return True
        except Exception as e:
            print(f"Error saving agent {agent_model.id} to Elasticsearch: {e}")
            return False

    def get_agent(self, agent_id: str) -> Dict[str, Any] | None:
        if not self.client:
            print("Elasticsearch client not available. Cannot get agent.")
            return None
        try:
            doc = AgentDocument.get(id=agent_id)
            if doc:
                # Convert STMDocument and LTMDocument back to Pydantic models
                agent_data = doc.to_dict()
                if 'stm' in agent_data and isinstance(doc.stm, STMDocument):
                    agent_data['stm'] = doc.stm.to_pydantic().model_dump()
                if 'ltm' in agent_data and isinstance(doc.ltm, LTMDocument):
                    agent_data['ltm'] = doc.ltm.to_pydantic().model_dump()
                
                # The agent_id from AgentDocument is already the 'id' we want for AbstractAgent Pydantic model
                agent_data['id'] = doc.agent_id 
                return agent_data
            return None
        except Exception as e: # elasticsearch.exceptions.NotFoundError if not found
            print(f"Error retrieving agent {agent_id} from Elasticsearch: {e}")
            return None

    def get_all_agents(self) -> List[Dict[str, Any]]:
        if not self.client:
            print("Elasticsearch client not available. Cannot get all agents.")
            return []
        try:
            search = AgentDocument.search()
            agents = []
            for hit in search.execute():
                agent_data = hit.to_dict()
                if 'stm' in agent_data and isinstance(hit.stm, STMDocument):
                    agent_data['stm'] = hit.stm.to_pydantic().model_dump()
                if 'ltm' in agent_data and isinstance(hit.ltm, LTMDocument):
                    agent_data['ltm'] = hit.ltm.to_pydantic().model_dump()
                agent_data['id'] = hit.agent_id
                agents.append(agent_data)
            return agents
        except Exception as e:
            print(f"Error retrieving all agents from Elasticsearch: {e}")
            return []

# --- AbstractAgentPydantic (Illustrative Pydantic model for type hinting) ---
# This is needed because AbstractAgent itself is a Pydantic model
# and we need to type hint it in ElasticsearchService.
# It should match the structure of app.agents.base.AbstractAgent
class AbstractAgentPydantic(BaseModel):
    id: str
    name: str
    role: str
    stm: ShortTermMemory
    ltm: LongTermMemory
    config: Dict[str, Any]

# Global instance (can be initialized in main app or on first use)
# es_service = ElasticsearchService() 
# Defer initialization to where it's used to manage lifecycle better, e.g., in FastAPI app startup.

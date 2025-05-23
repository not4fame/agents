from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from app.services.elasticsearch_service import ElasticsearchService, AGENT_INDEX_NAME, AbstractAgentPydantic
from app.agents.base import AbstractAgent, get_es_service # To use the getter
from app.agents.manager import ManagerAgent # Example agent
from app.models.memory import ShortTermMemory, LongTermMemory # For creating new agents
from app.models.task import MainTask # For type hinting
from typing import List

# Add these imports to backend/app/main.py
from app.workflow_manager import WorkflowManager
from pydantic import BaseModel as PydanticBaseModel # Alias to avoid conflict with AbstractAgent's BaseModel

es_service_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global es_service_instance
    print("Application startup: Initializing Elasticsearch connection...")
    # Initialize ES Service from agents.base to ensure it's the same instance
    es_service_instance = get_es_service() 
    if not es_service_instance or not es_service_instance.client:
        print("ERROR: Elasticsearch service failed to initialize. API might not function correctly.")
        # Optionally, raise an exception here to prevent startup if ES is critical
    else:
        print("Elasticsearch connection established successfully.")
    yield
    print("Application shutdown: Cleaning up resources (if any)...")


app = FastAPI(title="Agent Management System API", lifespan=lifespan)

@app.get("/")
async def root():
    return {"message": "Welcome to the Agent Management System API", "elasticsearch_status": "initialized" if es_service_instance and es_service_instance.client else "error"}

# Example CRUD for Agents
@app.post("/agents/", response_model=AbstractAgentPydantic, status_code=201)
async def create_agent_api(agent_data: AbstractAgentPydantic):
    # Note: agent_data here should be the Pydantic model of an agent.
    # For simplicity, we assume the client sends data that can directly initialize an AbstractAgent or ManagerAgent.
    
    if agent_data.role == "Manager":
        agent = ManagerAgent(**agent_data.model_dump())
    else:
        agent = AbstractAgent(**agent_data.model_dump())
            
    if not agent.save_state():
        raise HTTPException(status_code=500, detail="Failed to save agent to Elasticsearch")
    # AbstractAgent and ManagerAgent instances are compatible with AbstractAgentPydantic
    return agent 

@app.get("/agents/{agent_id}", response_model=AbstractAgentPydantic)
async def get_agent_api(agent_id: str):
    # Create a new agent instance to load data into. 
    agent_shell = AbstractAgent() 
    if not agent_shell.load_state(agent_id):
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # agent_shell is an instance of AbstractAgent, which is compatible with AbstractAgentPydantic
    return agent_shell

@app.get("/agents/", response_model=List[AbstractAgentPydantic])
async def list_agents_api():
    global es_service_instance # Ensure we are using the initialized instance
    if not es_service_instance or not es_service_instance.client:
        raise HTTPException(status_code=500, detail="Elasticsearch service not available")
    agents_data = es_service_instance.get_all_agents()
    # Convert list of dicts from ES service to list of AbstractAgentPydantic models
    return [AbstractAgentPydantic(**data) for data in agents_data]

# Example: Test endpoint to create and load a ManagerAgent
@app.post("/test_manager_lifecycle/")
async def test_manager():
    manager = ManagerAgent(name="LifecycleTestManager", role="Manager")
    manager.stm.scratchpad["initial_note"] = "Testing lifecycle"
    
    save_success = manager.save_state()
    if not save_success:
        # Aligning with subtask's error reporting for this specific test endpoint
        return {"status": "error", "message": "Failed to save manager initially"}
            
    # Create a new instance to load into.
    loaded_manager = ManagerAgent() # Create a new instance to load into
    load_success = loaded_manager.load_state(manager.id) # Load by ID
    
    if not load_success:
        # Aligning with subtask's error reporting
        return {"status": "error", "message": f"Failed to load manager {manager.id}"}
            
    return {
        "status": "success",
        "original_id": manager.id,
        "loaded_id": loaded_manager.id,
        "loaded_name": loaded_manager.name,
        "loaded_scratchpad": loaded_manager.stm.scratchpad
    }

class RunWorkflowRequest(PydanticBaseModel):
    user_query: str
    designated_agent_ids: List[str] = [] # Optional, Manager might have defaults or discover
    overall_goal_desc: str

@app.post("/workflow/run_main_task")
async def run_main_task_workflow(request: RunWorkflowRequest):
    # This assumes a single ManagerAgent instance for simplicity.
    # In a multi-user or multi-tenant system, you'd fetch or create a ManagerAgent per user/session.
    
    # Try to load a default manager or create one if not found
    manager_id = "default_manager_001" # Example static ID
    manager = ManagerAgent(id=manager_id, name="DefaultWorkflowManager")
    
    # Try to load its state. If not found, it's a new manager (or using default state).
    if not manager.load_state(): 
        print(f"Manager with ID {manager_id} not found or failed to load. Using new/default state.")
        # Save initial state if it's considered "new"
        manager.save_state() 
    else:
        print(f"Loaded existing Manager {manager.id} ({manager.name})")

    workflow_runner = WorkflowManager(manager_agent=manager)
    
    try:
        result = workflow_runner.run_main_task_loop(
            user_query=request.user_query,
            designated_agent_ids=request.designated_agent_ids,
            overall_goal_desc=request.overall_goal_desc
        )
        return result
    except Exception as e:
        # Log the exception details for debugging
        print(f"Error during workflow execution: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    # The main uvicorn.run should be handled by Docker CMD or a run script.
    # This is for direct execution if needed.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

// frontend/admin-panel/src/lib/agents/AbstractAgentTS.ts
import { v4 as uuidv4 } from 'uuid';
import { 
  AbstractAgentState, 
  ShortTermMemory, 
  LongTermMemory, 
  AgentConfig,
  createDefaultSTM,
  createDefaultLTM 
} from '../models/agentModels';
import { ElasticsearchServiceTS } from '../services/elasticsearchService'; // Import ES Service

export class AbstractAgentTS implements AbstractAgentState {
  id: string;
  name: string;
  role: string;
  stm: ShortTermMemory;
  ltm: LongTermMemory;
  config: AgentConfig;
  private readonly esService: ElasticsearchServiceTS; // Add esService member

  constructor(initialState?: Partial<AbstractAgentState>, esServiceInstance?: ElasticsearchServiceTS) {
    this.id = initialState?.id || uuidv4();
    this.name = initialState?.name || "Unnamed Agent";
    this.role = initialState?.role || "Generic Agent";
    this.stm = initialState?.stm || createDefaultSTM();
    this.ltm = initialState?.ltm || createDefaultLTM();
    this.config = initialState?.config || {};
    this.esService = esServiceInstance || new ElasticsearchServiceTS(); // Use provided or create new
    
    console.log(`Agent ${this.name} (ID: ${this.id}) initialized.`);
  }

  async saveState(): Promise<boolean> {
    try {
      const agentState: AbstractAgentState = {
        id: this.id,
        name: this.name,
        role: this.role,
        stm: this.stm,
        ltm: this.ltm,
        config: this.config,
      };
      await this.esService.saveAgent(agentState);
      console.log(`Agent ${this.id} state saved successfully via esService.`);
      return true;
    } catch (error) {
      console.error(`Error saving agent ${this.id} state:`, error);
      return false;
    }
  }

  async loadState(agentIdToLoad?: string): Promise<boolean> {
    const targetId = agentIdToLoad || this.id;
    try {
      const loadedState = await this.esService.getAgent(targetId);
      if (loadedState) {
        this.id = loadedState.id; // Ensure this instance's ID is updated if loaded by a different ID
        this.name = loadedState.name;
        this.role = loadedState.role;
        this.stm = loadedState.stm;
        this.ltm = loadedState.ltm;
        this.config = loadedState.config;
        console.log(`Agent ${this.id} state loaded successfully via esService.`);
        return true;
      }
      console.log(`Agent state for ${targetId} not found via esService.`);
      return false;
    } catch (error) {
      console.error(`Error loading agent ${targetId} state:`, error);
      return false;
    }
  }

  processMessage(message: string): string {
    // Mock implementation
    console.log(`Agent ${this.name} received message: ${message}`);
    this.stm.history.push({ role: "user", content: message });
    const response = `Agent ${this.name} processed: ${message}`;
    this.stm.history.push({ role: "assistant", content: response });
    this.saveState(); // Call saveState after processing
    return response;
  }
}

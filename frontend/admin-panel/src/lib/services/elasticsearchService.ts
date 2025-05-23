// frontend/admin-panel/src/lib/services/elasticsearchService.ts
import { Client } from '@elastic/elasticsearch';
import type { AbstractAgentState } from '../models/agentModels'; // Assuming models are in this path

const ELASTICSEARCH_HOST = process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
const AGENT_INDEX_NAME = 'agents_index_ts'; // Using a new index name for TS version

let client: Client | null = null;

function getElasticClient(): Client {
  if (!client) {
    try {
      client = new Client({
        node: ELASTICSEARCH_HOST,
        // Add other client configurations here if needed (e.g., auth, cloud ID)
        // requestTimeout: 5000, // Example: 5 seconds
      });
      console.log('Elasticsearch client initialized:', ELASTICSEARCH_HOST);
    } catch (error) {
      console.error('Failed to initialize Elasticsearch client:', error);
      throw error; // Rethrow to indicate failure, or handle more gracefully
    }
  }
  return client;
}

export class ElasticsearchServiceTS {
  private client: Client;

  constructor() {
    this.client = getElasticClient();
  }

  async ensureAgentIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: AGENT_INDEX_NAME });
      if (!indexExists) {
        console.log(`Index ${AGENT_INDEX_NAME} does not exist. Creating...`);
        await this.client.indices.create({
          index: AGENT_INDEX_NAME,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                role: { type: 'keyword' },
                // STM and LTM are objects. Elasticsearch can map them dynamically,
                // or you can define specific properties if needed for querying.
                // For simplicity, dynamic mapping for stm and ltm objects is fine initially.
                stm: { type: 'object', enabled: false }, // 'enabled: false' means not indexed for search, just stored
                ltm: { type: 'object', enabled: false },
                config: { type: 'object', dynamic: true }, // Allow any fields in config
              },
            },
          },
        });
        console.log(`Index ${AGENT_INDEX_NAME} created successfully.`);
      } else {
        // console.log(`Index ${AGENT_INDEX_NAME} already exists.`);
      }
    } catch (error) {
      console.error(`Error ensuring agent index ${AGENT_INDEX_NAME}:`, error);
      // Depending on the error, you might want to throw or handle
    }
  }

  async saveAgent(agentState: AbstractAgentState): Promise<void> {
    await this.ensureAgentIndex(); // Ensure index exists before saving
    try {
      await this.client.index({
        index: AGENT_INDEX_NAME,
        id: agentState.id, // Use agent's ID as Elasticsearch document ID
        document: agentState,
        refresh: 'wait_for', // Wait for changes to be visible to search
      });
      console.log(`Agent ${agentState.id} (${agentState.name}) saved/updated successfully.`);
    } catch (error) {
      console.error(`Error saving agent ${agentState.id} to Elasticsearch:`, error);
      throw error; // Rethrow to allow API route to handle
    }
  }

  async getAgent(agentId: string): Promise<AbstractAgentState | null> {
    // await this.ensureAgentIndex(); // Not strictly necessary for get if index is guaranteed by save/list
    try {
      const response = await this.client.get<AbstractAgentState>({
        index: AGENT_INDEX_NAME,
        id: agentId,
      });
      if (response._source) {
        return response._source;
      }
      return null;
    } catch (error: any) {
      if (error.meta && error.meta.statusCode === 404) {
        console.log(`Agent ${agentId} not found in Elasticsearch.`);
        return null;
      }
      console.error(`Error retrieving agent ${agentId} from Elasticsearch:`, error);
      throw error; // Rethrow for other errors
    }
  }

  async getAllAgents(): Promise<AbstractAgentState[]> {
    await this.ensureAgentIndex(); // Good to ensure index exists before searching
    try {
      const response = await this.client.search<AbstractAgentState>({
        index: AGENT_INDEX_NAME,
        body: {
          query: {
            match_all: {},
          },
          size: 1000, // Adjust size as needed
        },
      });
      return response.hits.hits.map(hit => hit._source).filter(Boolean) as AbstractAgentState[];
    } catch (error) {
      console.error('Error retrieving all agents from Elasticsearch:', error);
      // If the index doesn't exist, search might fail.
      // Depending on strictness, you might return [] or throw.
      if (error.message.includes('index_not_found_exception')) {
          console.warn(`Index ${AGENT_INDEX_NAME} not found while trying to get all agents. Returning empty list.`);
          return [];
      }
      throw error;
    }
  }
}

// Optional: Export a singleton instance if preferred for simplicity in API routes
// export const elasticsearchServiceInstance = new ElasticsearchServiceTS();
// However, managing client connections and potential re-initialization might be
// better handled by creating instances as needed or using a more robust DI system.
// For Next.js API routes, creating it per call or using a cached global instance is common.
// The getElasticClient function provides a simple caching mechanism for the client itself.

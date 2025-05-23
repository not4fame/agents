// frontend/admin-panel/src/pages/api/agents/[agentId].ts
import type { NextApiRequest, NextApiResponse } from 'next';

const PYTHON_API_SERVICE_URL = 'http://python_api_service:8000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { agentId } = req.query;

  if (req.method === 'GET') {
    // Get specific Agent
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ message: 'Agent ID is required' });
    }
    try {
      const response = await fetch(`${PYTHON_API_SERVICE_URL}/agents/${agentId}`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Error from python_api_service (GET /agents/${agentId}):`, errorData);
        if (response.status === 404) {
          return res.status(404).json({ message: `Agent ${agentId} not found via Python service`, details: errorData });
        }
        return res.status(response.status).json({ message: `Failed to fetch agent ${agentId} from Python service`, details: errorData });
      }
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error(`Network or other error fetching agent ${agentId}:`, error);
      res.status(500).json({ message: `Internal server error fetching agent ${agentId}`, details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']); // Add PUT, DELETE later if needed
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

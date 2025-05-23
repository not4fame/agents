// frontend/admin-panel/src/pages/api/agents/[agentId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ElasticsearchServiceTS } from '@/lib/services/elasticsearchService'; // Adjust path

const esService = new ElasticsearchServiceTS();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { agentId } = req.query;
  await esService.ensureAgentIndex();

  if (typeof agentId !== 'string') {
    return res.status(400).json({ message: 'Agent ID must be a string.' });
  }

  if (req.method === 'GET') {
    try {
      const agentState = await esService.getAgent(agentId);
      if (agentState) {
        res.status(200).json(agentState);
      } else {
        res.status(404).json({ message: `Agent ${agentId} not found.` });
      }
    } catch (error: any) {
      console.error(`Error fetching agent ${agentId}:`, error);
      res.status(500).json({ message: `Failed to fetch agent ${agentId}`, details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']); // Add PUT, DELETE later if needed
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

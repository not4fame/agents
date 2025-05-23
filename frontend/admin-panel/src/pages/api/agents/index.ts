// frontend/admin-panel/src/pages/api/agents/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ElasticsearchServiceTS } from '@/lib/services/elasticsearchService'; // Adjust path as needed
import { AbstractAgentState, createDefaultSTM, createDefaultLTM } from '@/lib/models/agentModels'; // Adjust path
// import { ManagerAgentTS } from '@/lib/agents/ManagerAgentTS'; // Not directly used for instantiation here
// import { AbstractAgentTS } from '@/lib/agents/AbstractAgentTS'; // Not directly used for instantiation here
import { v4 as uuidv4 } from 'uuid';

// It's generally better to instantiate services like this outside the handler
// if they are stateless or manage their own state safely (like ES client pooling).
// However, for Next.js serverless functions, it might be re-instantiated per call anyway.
// For now, new instance per call or a simple cached instance is fine.
const esService = new ElasticsearchServiceTS();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await esService.ensureAgentIndex(); // Ensure index exists on first call or periodically

  if (req.method === 'GET') {
    try {
      const agents = await esService.getAllAgents();
      res.status(200).json(agents);
    } catch (error: any) {
      console.error('Error fetching all agents:', error);
      res.status(500).json({ message: 'Failed to fetch agents', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const agentData = req.body as Partial<AbstractAgentState>;
      
      // Basic validation
      if (!agentData.name || !agentData.role) {
        return res.status(400).json({ message: 'Agent name and role are required.' });
      }

      const newAgentState: AbstractAgentState = {
        id: agentData.id || uuidv4(),
        name: agentData.name,
        role: agentData.role,
        stm: agentData.stm || createDefaultSTM(),
        ltm: agentData.ltm || createDefaultLTM(),
        config: agentData.config || {},
      };
      
      // This step will be more nuanced when AbstractAgentTS.saveState uses esService
      // For now, we directly use esService.saveAgent with the state object.
      await esService.saveAgent(newAgentState);
      
      // Return the created agent's state.
      // If ManagerAgent was specified, we could potentially return a ManagerAgentTS instance,
      // but the state is what's stored and generally what's returned over API.
      res.status(201).json(newAgentState);
    } catch (error: any) {
      console.error('Error creating agent:', error);
      res.status(500).json({ message: 'Failed to create agent', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

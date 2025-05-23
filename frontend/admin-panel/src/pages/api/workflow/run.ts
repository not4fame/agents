// frontend/admin-panel/src/pages/api/workflow/run.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ManagerAgentTS } from '@/lib/agents/ManagerAgentTS'; // Adjust path
import { WorkflowManagerTS } from '@/lib/workflowManagerTS'; // Adjust path
import { ElasticsearchServiceTS } from '@/lib/services/elasticsearchService'; // Adjust path
import { AbstractAgentState } from '@/lib/models/agentModels';

const esService = new ElasticsearchServiceTS(); // Needed to load/save manager agent state

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { user_query, overall_goal_desc, designated_agent_ids, manager_agent_id } = req.body;

      if (!user_query || !overall_goal_desc) {
        return res.status(400).json({ message: 'user_query and overall_goal_desc are required.' });
      }
      
      await esService.ensureAgentIndex();

      // For simplicity, using a default or first available Manager agent.
      // In a real app, manager_agent_id might be passed or determined by user session.
      let managerState: AbstractAgentState | null = null;
      const targetManagerId = manager_agent_id || "default_manager_ts_001"; // Example ID

      if (manager_agent_id) {
         managerState = await esService.getAgent(manager_agent_id);
         if (!managerState || managerState.role !== "Manager") {
            return res.status(404).json({ message: `Manager agent with ID ${manager_agent_id} not found or not a Manager.` });
         }
      } else {
        // Try to get a default manager, or create if not found
        managerState = await esService.getAgent(targetManagerId);
        if (!managerState) {
            console.log(`Default manager ${targetManagerId} not found, creating one.`);
            const newManager = new ManagerAgentTS({ id: targetManagerId, name: "Default TS Manager" });
            // Save its initial state directly using esService for now
            // In full impl, newManager.saveState() would use esService
            await esService.saveAgent({
                id: newManager.id,
                name: newManager.name,
                role: newManager.role,
                stm: newManager.stm,
                ltm: newManager.ltm,
                config: newManager.config,
            });
            managerState = await esService.getAgent(targetManagerId); // Load after saving
            if (!managerState) throw new Error("Failed to create/load default manager");
        } else if (managerState.role !== "Manager") {
             return res.status(400).json({ message: `Agent ${targetManagerId} is not a Manager.` });
        }
      }
      
      const managerAgent = new ManagerAgentTS(managerState); 
      // Link the agent to the ES service for its own save/load operations if designed that way,
      // or ensure WorkflowManager handles saving state changes.
      // For now, ManagerAgentTS.saveState/loadState are mocks.
      // The WorkflowManager will need to call managerAgent.saveState() which should then use esService.

      const workflowManager = new WorkflowManagerTS(managerAgent);
      const result = await workflowManager.runMainTaskLoop(
        user_query,
        designated_agent_ids || [],
        overall_goal_desc
      );
      
      // After the loop, the managerAgent instance might have changed state (STM, LTM).
      // Persist these changes.
      // This relies on the ManagerAgent's saveState being implemented correctly eventually.
      // For now, let's explicitly save the state from the instance using esService.
      await esService.saveAgent({
          id: managerAgent.id,
          name: managerAgent.name,
          role: managerAgent.role,
          stm: managerAgent.stm,
          ltm: managerAgent.ltm,
          config: managerAgent.config,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error running workflow:', error);
      res.status(500).json({ message: 'Failed to run workflow', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

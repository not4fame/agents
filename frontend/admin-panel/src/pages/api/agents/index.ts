// frontend/admin-panel/src/pages/api/agents/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const PYTHON_API_SERVICE_URL = 'http://python_api_service:8000'; // Internal Docker network URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // List Agents
    try {
      const response = await fetch(`${PYTHON_API_SERVICE_URL}/agents/`);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error from python_api_service (GET /agents/):', errorData);
        return res.status(response.status).json({ message: 'Failed to fetch agents from Python service', details: errorData });
      }
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Network or other error fetching agents:', error);
      res.status(500).json({ message: 'Internal server error fetching agents', details: error.message });
    }
  } else if (req.method === 'POST') {
    // Create Agent
    try {
      const response = await fetch(`${PYTHON_API_SERVICE_URL}/agents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error from python_api_service (POST /agents/):', errorData);
        return res.status(response.status).json({ message: 'Failed to create agent via Python service', details: errorData });
      }
      const data = await response.json();
      res.status(response.status).json(data); // Usually 201 Created
    } catch (error) {
      console.error('Network or other error creating agent:', error);
      res.status(500).json({ message: 'Internal server error creating agent', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// frontend/admin-panel/src/pages/api/workflow/run.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const PYTHON_API_SERVICE_URL = 'http://python_api_service:8000'; // Internal Docker network URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Run main task workflow
    try {
      const response = await fetch(`${PYTHON_API_SERVICE_URL}/workflow/run_main_task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Potentially add other headers if needed, e.g., for auth propagation
        },
        body: JSON.stringify(req.body), // Forward the request body from the client
      });

      // It's important to handle the response from the Python service carefully.
      // It might not always be JSON if an unexpected error occurs in the Python service.
      const responseBodyText = await response.text(); // Read body as text first

      if (!response.ok) {
        console.error('Error from python_api_service (POST /workflow/run_main_task):', responseBodyText);
        // Try to parse as JSON if possible, otherwise send text
        let errorDetails = responseBodyText;
        try {
            errorDetails = JSON.parse(responseBodyText);
        } catch (e) {
            // Not JSON, use raw text
        }
        return res.status(response.status).json({ 
            message: 'Failed to run workflow via Python service', 
            details: errorDetails 
        });
      }

      // If response.ok, assume it's JSON as per FastAPI endpoint spec
      try {
        const data = JSON.parse(responseBodyText);
        res.status(response.status).json(data); // Forward status and data
      } catch (e) {
        console.error('Failed to parse successful JSON response from python_api_service:', e);
        res.status(500).json({ message: 'Failed to parse response from Python service', details: responseBodyText });
      }

    } catch (error) {
      console.error('Network or other error running workflow:', error);
      res.status(500).json({ message: 'Internal server error running workflow', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

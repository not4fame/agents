"use client";

import React, { useState } from 'react';

// Mock API function (replace with actual API calls later)
const mockRunMainTask = async (taskData: any): Promise<any> => {
  console.log("Running main task (mock):", taskData);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  const mockResponse = {
    main_task_id: `maintask_${Math.random().toString(36).substr(2, 9)}`,
    status: "COMPLETED (mock)",
    iterations: Math.floor(Math.random() * 5) + 1,
    results: { summary: "Task completed successfully by mock." },
    subtasks: [
      { id: "sub1", name: "Mock Subtask 1", status: "COMPLETED", results: { output: "Mock output 1" } },
      { id: "sub2", name: "Mock Subtask 2", status: "COMPLETED", results: { output: "Mock output 2" } },
    ],
    learned_rules_count: Math.floor(Math.random() * 3)
  };
  alert(`Mock Task Submitted!\nID: ${mockResponse.main_task_id}\nStatus: ${mockResponse.status}\nData: ${JSON.stringify(taskData)}`);
  return mockResponse;
};


export default function TasksPage() {
  const [userQuery, setUserQuery] = useState('');
  const [overallGoalDesc, setOverallGoalDesc] = useState('');
  const [designatedAgents, setDesignatedAgents] = useState(''); // Comma-separated string of agent IDs
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<any | null>(null);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setTaskResult(null);

    const agentIds = designatedAgents.split(',').map(id => id.trim()).filter(id => id);

    try {
      // TODO: Replace with actual API call to /workflow/run_main_task
      const result = await mockRunMainTask({ 
        user_query: userQuery, 
        overall_goal_desc: overallGoalDesc,
        designated_agent_ids: agentIds
      });
      setTaskResult(result);
    } catch (err) {
      setError('Failed to submit task.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Define and Run New Task</h1>

      <form onSubmit={handleSubmitTask} className="p-6 border rounded shadow-lg bg-white">
        <div className="mb-4">
          <label htmlFor="userQuery" className="block text-sm font-medium text-gray-700 mb-1">
            User Query / Main Objective:
          </label>
          <textarea
            id="userQuery"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Develop a new reporting feature for sales data."
          />
        </div>

        <div className="mb-4">
          <label htmlFor="overallGoalDesc" className="block text-sm font-medium text-gray-700 mb-1">
            Overall Goal Description (for Manager Agent):
          </label>
          <input
            type="text"
            id="overallGoalDesc"
            value={overallGoalDesc}
            onChange={(e) => setOverallGoalDesc(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Create a comprehensive sales report feature."
          />
        </div>

        <div className="mb-6">
          <label htmlFor="designatedAgents" className="block text-sm font-medium text-gray-700 mb-1">
            Designated Agent IDs (comma-separated, optional):
          </label>
          <input
            type="text"
            id="designatedAgents"
            value={designatedAgents}
            onChange={(e) => setDesignatedAgents(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., agent1, code_gen_agent_007"
          />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:bg-gray-400"
        >
          {isLoading ? 'Submitting Task...' : 'Submit Task to Manager Agent'}
        </button>
      </form>

      {taskResult && (
        <div className="mt-8 p-6 border rounded shadow-lg bg-white">
          <h2 className="text-xl font-semibold mb-3">Task Submission Result:</h2>
          <p><strong>Main Task ID:</strong> {taskResult.main_task_id}</p>
          <p><strong>Status:</strong> {taskResult.status}</p>
          <p><strong>Iterations:</strong> {taskResult.iterations}</p>
          <p><strong>Learned Rules Count:</strong> {taskResult.learned_rules_count}</p>
          <h3 className="text-lg font-medium mt-3 mb-1">Summary:</h3>
          <p>{taskResult.results?.summary || "No summary provided."}</p>
          
          <h3 className="text-lg font-medium mt-3 mb-1">Subtasks:</h3>
          {taskResult.subtasks && taskResult.subtasks.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {taskResult.subtasks.map((st: any) => (
                <li key={st.id} className="text-sm">
                  {st.name} ({st.status}) - Results: {JSON.stringify(st.results)}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm">No subtasks detailed.</p>}
        </div>
      )}
    </div>
  );
}

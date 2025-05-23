"use client"; // Required for useState, useEffect, event handlers

import React, { useState, useEffect } from 'react';

// Define an interface for Agent data (matches backend AbstractAgentPydantic for now)
interface Agent {
  id: string;
  name: string;
  role: string;
  config: Record<string, any>; // Simple config for now
  // stm and ltm are complex, maybe not displayed directly in list
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for new agent
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('Generic Agent'); // Default role
  const [newAgentConfig, setNewAgentConfig] = useState(''); // Simple JSON string for config

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/agents');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || 'Failed to fetch agents');
        }
        const data = await response.json();
        setAgents(data);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load agents.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAgents();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      let parsedConfig = {};
      if (newAgentConfig.trim()) {
        try {
          parsedConfig = JSON.parse(newAgentConfig);
        } catch (jsonError) {
          setError("Invalid JSON format for agent configuration.");
          return;
        }
      }
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newAgentName, role: newAgentRole, config: parsedConfig, stm: {}, ltm: {} }), // Add empty stm/ltm for AbstractAgentPydantic
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Failed to create agent');
      }
      const createdAgent = await response.json();
      setAgents(prevAgents => [...prevAgents, createdAgent]);
      setNewAgentName('');
      setNewAgentRole('Generic Agent');
      setNewAgentConfig('');
    } catch (err) {
      setError(err.message || 'Failed to create agent.');
      console.error(err);
    }
  };

  // Moved isLoading display and error display to be part of the main layout
  // if (isLoading) return <div className="p-4"><p>Loading agents...</p></div>; 

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Agent Management</h1>

      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Create New Agent</h2>
        <form onSubmit={handleCreateAgent}>
          <div className="mb-3">
            <label htmlFor="agentName" className="block text-sm font-medium text-gray-700">Name:</label>
            <input
              type="text"
              id="agentName"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="agentRole" className="block text-sm font-medium text-gray-700">Role:</label>
            <input
              type="text"
              id="agentRole"
              value={newAgentRole}
              onChange={(e) => setNewAgentRole(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="agentConfig" className="block text-sm font-medium text-gray-700">Configuration (JSON format):</label>
            <textarea
              id="agentConfig"
              value={newAgentConfig}
              onChange={(e) => setNewAgentConfig(e.target.value)}
              rows={3}
              placeholder='{ "key": "value", "feature_enabled": true }'
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Create Agent
          </button>
        </form>
      </div>

      <h2 className="text-xl font-semibold mb-3">Existing Agents</h2>
      {isLoading && <p>Loading agents...</p>}
      {!isLoading && error && <p className="text-red-500">{error}</p>} {/* Display error if not loading */}
      {!isLoading && !error && agents.length === 0 && <p>No agents defined yet.</p>}
      {!isLoading && !error && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="p-4 border rounded shadow">
              <h3 className="text-lg font-semibold">{agent.name}</h3>
              <p className="text-sm text-gray-600">ID: {agent.id}</p>
              <p className="text-sm text-gray-600">Role: {agent.role}</p>
              {agent.config && Object.keys(agent.config).length > 0 && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(agent.config, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

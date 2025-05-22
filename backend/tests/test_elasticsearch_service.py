import unittest
from unittest.mock import patch, MagicMock
from app.services.elasticsearch_service import ElasticsearchService, AgentDocument, STMDocument, LTMDocument, AGENT_INDEX_NAME
from app.models.memory import ShortTermMemory, LongTermMemory
# Using the actual AbstractAgent for test data, but will need to create a concrete version for Pydantic model
from pydantic import BaseModel, Field # Import Field for default_factory
from typing import Dict, Any # For AbstractAgent config
import uuid # For AbstractAgent id
import logging # For capturing log messages

# A Pydantic model that mirrors AbstractAgent for testing save/load
class TestAgentModel(BaseModel): # Sticking to BaseModel to avoid side-effects from AbstractAgent's __init__
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Test Agent"
    role: str = "Tester"
    stm: ShortTermMemory = Field(default_factory=ShortTermMemory)
    ltm: LongTermMemory = Field(default_factory=LongTermMemory)
    config: Dict[str, Any] = {}

    # Add a save_state method for the test_abstract_agent_save_state test
    # This is a simplified mock of the real save_state for testing purposes here.
    # In a more complex scenario, AbstractAgent itself would be used or a more faithful mock.
    @patch('app.agents.base.get_es_service') # Patch within the method if it's called by TestAgentModel's methods
    def save_state(self, mock_get_es_service_inner):
        # This is tricky because the actual AbstractAgent.save_state calls get_es_service()
        # and then calls save_agent on that service.
        # The test in the prompt is for AbstractAgent's save_state, so this model
        # should behave like AbstractAgent.
        # For this specific test structure, we'll assume the test is more about
        # an agent-like object calling a service.
        # The patch in the test_abstract_agent_save_state below is more appropriate.
        # This method here is just a placeholder if TestAgentModel needed its own save_state.
        # For the subtask's test, this method on TestAgentModel is not directly called.
        # The subtask is testing AbstractAgent's save_state method.
        # So, TestAgentModel is just a data container here.
        pass


class TestElasticsearchService(unittest.TestCase):

    @patch('app.services.elasticsearch_service.Elasticsearch')
    @patch('app.services.elasticsearch_service.connections')
    def test_service_initialization_success(self, mock_connections, mock_elasticsearch_constructor):
        mock_es_client = MagicMock()
        mock_es_client.ping.return_value = True
        mock_elasticsearch_constructor.return_value = mock_es_client
        
        mock_indices_client = MagicMock()
        mock_es_client.indices = mock_indices_client # Correct for ES v8+
        mock_indices_client.exists.return_value = True


        service = ElasticsearchService(host="http://mock-es:9200")
        self.assertIsNotNone(service.client)
        mock_elasticsearch_constructor.assert_called_with("http://mock-es:9200", timeout=30, max_retries=3, retry_on_timeout=True)
        mock_es_client.ping.assert_called_once()
        mock_connections.create_connection.assert_called_with(alias='default', hosts=['http://mock-es:9200'])
        mock_es_client.indices.exists.assert_called_with(index=AGENT_INDEX_NAME)

    @patch('app.services.elasticsearch_service.Elasticsearch')
    def test_service_initialization_ping_fails(self, mock_elasticsearch_constructor):
        mock_es_client = MagicMock()
        mock_es_client.ping.return_value = False # Simulate ping failure
        mock_elasticsearch_constructor.return_value = mock_es_client
        
        # Capture print statements by redirecting stdout or using logging assertions
        # The subtask uses self.assertLogs, which requires actual logging calls in the tested code.
        # The provided ElasticsearchService uses print(). To test print(), we patch builtins.print.
        # If ElasticsearchService used logging.error(), then assertLogs would be appropriate.
        
        # Let's assume the intent is to check for an error message being printed.
        with patch('builtins.print') as mock_print:
            service = ElasticsearchService(host="http://mock-es:9200")
            self.assertIsNone(service.client)
            # Check if "Failed to connect to Elasticsearch" or similar was printed
            error_message_printed = False
            for call_arg in mock_print.call_args_list:
                if "Elasticsearch connection error" in call_arg[0][0] or "Failed to connect to Elasticsearch" in call_arg[0][0]:
                    error_message_printed = True
                    break
            self.assertTrue(error_message_printed, "Connection failure message was not printed.")


    @patch.object(AgentDocument, 'init')
    @patch('app.services.elasticsearch_service.Elasticsearch')
    @patch('app.services.elasticsearch_service.connections')
    def test_ensure_index_creates_if_not_exists(self, mock_connections, mock_elasticsearch_constructor, mock_agent_doc_init):
        mock_es_client = MagicMock()
        mock_es_client.ping.return_value = True
        mock_elasticsearch_constructor.return_value = mock_es_client
        
        mock_indices_client = MagicMock()
        mock_es_client.indices = mock_indices_client
        mock_indices_client.exists.return_value = False


        service = ElasticsearchService(host="http://mock-es:9200")
        
        self.assertIsNotNone(service.client)
        mock_agent_doc_init.assert_called_once() 

    def test_stm_document_conversion(self):
        pydantic_stm = ShortTermMemory(session_id="test_session", history=[{"msg": "hi"}])
        dsl_stm = STMDocument.from_pydantic(pydantic_stm)
        self.assertEqual(dsl_stm.session_id, "test_session")
        self.assertEqual(dsl_stm.history, [{"msg": "hi"}]) 
        
        pydantic_stm_converted = dsl_stm.to_pydantic()
        self.assertEqual(pydantic_stm_converted.session_id, "test_session")
        self.assertEqual(pydantic_stm_converted.history, [{"msg": "hi"}])

    def test_ltm_document_conversion(self):
        pydantic_ltm = LongTermMemory(knowledge_base={"fact": "true"})
        dsl_ltm = LTMDocument.from_pydantic(pydantic_ltm)
        self.assertEqual(dsl_ltm.knowledge_base, {"fact": "true"})

        pydantic_ltm_converted = dsl_ltm.to_pydantic()
        self.assertEqual(pydantic_ltm_converted.knowledge_base, {"fact": "true"})
        
    # This test is for AbstractAgent's save_state method, not ElasticsearchService directly.
    # It requires an instance of AbstractAgent or a mock that behaves like it.
    # The subtask description suggests using 'from app.agents.base import AbstractAgent'
    # and then 'class TestAgentModel(AbstractAgent): pass'. This could be problematic if
    # AbstractAgent.__init__ or other methods have side effects not mocked.
    # The patch below assumes we are testing an instance of the actual AbstractAgent.
    @patch('app.agents.base.ElasticsearchService') # Patch the class used by get_es_service
    def test_abstract_agent_save_state_integration(self, MockElasticsearchService):
        # We need to import the real AbstractAgent for this test as per subtask wording
        from app.agents.base import AbstractAgent, get_es_service, _es_service_instance

        # Reset the global service instance for test isolation
        global _es_service_instance
        _es_service_instance = None

        mock_service_instance = MockElasticsearchService.return_value
        mock_service_instance.client = MagicMock() # Mock that client is connected
        mock_service_instance.save_agent.return_value = True # Mock successful save

        # Instantiate the actual AbstractAgent
        agent = AbstractAgent(name="IntegrationTestAgent")
        
        # Ensure get_es_service returns our mocked instance
        # This is implicitly handled by patching ElasticsearchService which get_es_service instantiates

        agent.save_state() 
        
        # Verify that the service's save_agent method was called with the agent model
        mock_service_instance.save_agent.assert_called_once_with(agent)

        # Clean up global instance
        _es_service_instance = None


if __name__ == '__main__':
    unittest.main()

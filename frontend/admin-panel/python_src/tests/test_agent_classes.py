import unittest
from unittest.mock import MagicMock, patch # Added patch
from app.agents.base import AbstractAgent
from app.agents.manager import ManagerAgent
from app.models.memory import ShortTermMemory, LongTermMemory
from app.models.task import MainTask, Goal, SubTask, TaskStatus, Rule # Add these imports

class TestAgentClasses(unittest.TestCase):
    def test_abstract_agent_creation(self):
        agent = AbstractAgent(name="TestAgent", role="Tester")
        self.assertIsNotNone(agent.id)
        self.assertEqual(agent.name, "TestAgent")
        self.assertEqual(agent.role, "Tester")
        self.assertIsInstance(agent.stm, ShortTermMemory)
        self.assertIsInstance(agent.ltm, LongTermMemory)

    def test_manager_agent_creation(self):
        manager = ManagerAgent()
        self.assertEqual(manager.name, "Manager Agent")
        self.assertEqual(manager.role, "Manager")
        # self.assertEqual(manager.available_agents, []) # available_agents was removed
        # self.assertEqual(manager.current_plan, []) # current_plan was removed
        self.assertIsNone(manager.current_main_task_id)


    # test_manager_planning_mock is outdated as plan_task was removed.
    # New tests for new methods will be added below.

    def test_manager_initiate_main_task(self):
        # Patch get_es_service for this test to avoid actual ES connection for save_state
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock() # Mock that client is connected
            mock_service_instance.save_agent.return_value = True # Mock successful save
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="manager_for_task_test")
            manager.stm.current_task_data = {} 
            # manager.save_state = MagicMock() # Mocking get_es_service handles save_state's ES interaction

            main_task = manager.initiate_main_task("Test query", ["agent1"], "Test goal")
            self.assertIsNotNone(main_task)
            self.assertEqual(main_task.user_query, "Test query")
            self.assertEqual(manager.current_main_task_id, main_task.id)
            self.assertIn('active_main_task', manager.stm.current_task_data)
            # Check if save_state was called (which in turn calls the mocked service)
            mock_service_instance.save_agent.assert_called_with(manager)


    def test_manager_plan_subtasks(self):
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock()
            mock_service_instance.save_agent.return_value = True
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="planner_manager_test")
            manager.initiate_main_task("Develop feature x", [], "Goal for feature x")
            
            subtasks = manager.plan_subtasks()
            self.assertIsNotNone(subtasks)
            self.assertTrue(len(subtasks) > 0)
            self.assertIn("Design Feature X", [st.name for st in subtasks])
            
            main_task_data_dict = manager.stm.current_task_data.get('active_main_task')
            self.assertIsNotNone(main_task_data_dict)
            # Subtasks in STM are dicts after model_dump(), so access as dicts
            self.assertTrue(len(main_task_data_dict.get('sub_tasks', [])) > 0)

    def test_manager_get_next_executable_group_simple(self):
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock()
            mock_service_instance.save_agent.return_value = True
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="executor_manager_test_simple")
            main_task_obj = manager.initiate_main_task("Simple execution", [], "Simple goal")
            
            st1 = SubTask(name="Step 1", description="First step")
            st2 = SubTask(name="Step 2", description="Second step", dependencies=[st1.id])
            main_task_obj.sub_tasks = [st1, st2]
            manager._save_main_task(main_task_obj) 

            group = manager.get_next_executable_group()
            self.assertEqual(len(group), 1)
            self.assertEqual(group[0].name, "Step 1")

    def test_manager_execute_subtask_group_mock(self):
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock()
            mock_service_instance.save_agent.return_value = True
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="executor_manager_test_execute")
            main_task_obj = manager.initiate_main_task("Execute test", [], "Goal for execution")
            
            st1 = SubTask(name="Exec Step 1", description="First exec step")
            main_task_obj.sub_tasks = [st1]
            manager._save_main_task(main_task_obj)

            group_to_execute = [st1] 
            manager.execute_subtask_group(group_to_execute)
            
            updated_main_task = manager._get_main_task()
            self.assertEqual(updated_main_task.sub_tasks[0].status, TaskStatus.COMPLETED)
            self.assertIn("mock_output", updated_main_task.sub_tasks[0].results)
            # save_state is called multiple times in execute_subtask_group
            self.assertTrue(mock_service_instance.save_agent.call_count >= 1)


    def test_manager_retrospect_mock(self):
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock()
            mock_service_instance.save_agent.return_value = True
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="retrospect_manager_test")
            manager.ltm.learned_rules = [] 
            main_task_obj = manager.initiate_main_task("Retrospect test", [], "Goal for retrospection")
            
            st1 = SubTask(id="completed_st1", name="Completed Step 1", description="A completed step", status=TaskStatus.COMPLETED, results={"status_message": "Mock execution successful"})
            main_task_obj.sub_tasks = [st1]
            manager._save_main_task(main_task_obj)

            manager.retrospect(completed_group_ids=["completed_st1"])
            self.assertTrue(len(manager.ltm.learned_rules) >= 1)
            self.assertIn("last_retrospection_summary", manager.stm.scratchpad)
            self.assertTrue(mock_service_instance.save_agent.call_count >= 1)


    def test_manager_revalidate_rules_mock(self):
        with patch('app.agents.base.get_es_service') as mock_get_es_service:
            mock_service_instance = MagicMock()
            mock_service_instance.client = MagicMock()
            mock_service_instance.save_agent.return_value = True
            mock_get_es_service.return_value = mock_service_instance

            manager = ManagerAgent(id="revalidate_manager_test")
            rule1 = Rule(description="Rule for mock execution", context="test", actionable_guideline="Check mocks", source="test")
            manager.ltm.learned_rules = [rule1]
            
            manager.revalidate_rules()
            self.assertEqual(manager.ltm.learned_rules[0].validation_count, 1)
            self.assertIsNotNone(manager.ltm.learned_rules[0].last_validated_at)
            mock_service_instance.save_agent.assert_called_with(manager)


if __name__ == '__main__':
    unittest.main()

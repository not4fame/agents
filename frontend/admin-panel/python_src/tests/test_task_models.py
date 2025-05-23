import unittest
from app.models.task import TaskStatus, SubTask, Goal, Rule, MainTask

class TestTaskModels(unittest.TestCase):
    def test_subtask_creation(self):
        subtask = SubTask(name="Test Subtask", description="A test subtask")
        self.assertIsNotNone(subtask.id)
        self.assertTrue(subtask.id.startswith("subtask_"))
        self.assertEqual(subtask.name, "Test Subtask")
        self.assertEqual(subtask.status, TaskStatus.PENDING)
        self.assertEqual(subtask.results, {})
        self.assertEqual(subtask.dependencies, [])
        self.assertEqual(subtask.effort, 1)

    def test_goal_creation(self):
        goal = Goal(description="Test Goal", priority=2)
        self.assertIsNotNone(goal.id)
        self.assertTrue(goal.id.startswith("goal_"))
        self.assertEqual(goal.description, "Test Goal")
        self.assertEqual(goal.priority, 2)
        self.assertEqual(goal.acceptance_criteria, [])
        self.assertEqual(goal.related_subtask_ids, [])

    def test_rule_creation(self):
        rule = Rule(description="Test Rule", context="testing", actionable_guideline="Ensure tests pass", source="manual")
        self.assertIsNotNone(rule.id)
        self.assertTrue(rule.id.startswith("rule_"))
        self.assertEqual(rule.description, "Test Rule")
        self.assertEqual(rule.context, "testing")
        self.assertEqual(rule.actionable_guideline, "Ensure tests pass")
        self.assertEqual(rule.source, "manual")
        self.assertEqual(rule.validation_count, 0)
        self.assertIsNone(rule.last_validated_at)

    def test_maintask_creation(self):
        goal_desc = "Overall Test Goal"
        goal = Goal(description=goal_desc)
        maintask = MainTask(user_query="Test user query", overall_goal=goal)
        self.assertIsNotNone(maintask.id)
        self.assertTrue(maintask.id.startswith("maintask_"))
        self.assertEqual(maintask.user_query, "Test user query")
        self.assertEqual(maintask.overall_goal.description, goal_desc)
        self.assertEqual(maintask.sub_tasks, [])
        self.assertEqual(maintask.designated_agent_ids, [])
        self.assertEqual(maintask.status, TaskStatus.PENDING)
        self.assertEqual(maintask.session_stm_snapshot, {})
        self.assertEqual(maintask.applied_rules, [])
        self.assertEqual(maintask.final_results, {})

if __name__ == '__main__':
    unittest.main()

import unittest
from app.models.memory import ShortTermMemory, LongTermMemory

class TestMemoryModels(unittest.TestCase):
    def test_short_term_memory_creation(self):
        stm = ShortTermMemory()
        self.assertIsNotNone(stm.session_id)
        self.assertEqual(stm.history, [])
        self.assertEqual(stm.current_task_data, {})
        self.assertEqual(stm.scratchpad, {})

    def test_long_term_memory_creation(self):
        ltm = LongTermMemory()
        self.assertEqual(ltm.knowledge_base, {})
        self.assertEqual(ltm.learned_rules, [])
        self.assertEqual(ltm.past_project_iterations, [])

if __name__ == '__main__':
    unittest.main()

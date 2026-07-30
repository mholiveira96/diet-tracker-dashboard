import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[2] / 'migrations' / 'run_migration.py'
spec = importlib.util.spec_from_file_location('run_migration', MODULE_PATH)
run_migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run_migration)


class MigrationRunnerTest(unittest.TestCase):
    def test_pipeline_error_response_marks_migration_as_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.sql'
            path.write_text('SELECT 1;')
            with patch.object(run_migration, 'execute_sql', return_value={
                'results': [{'type': 'error', 'error': {'message': 'synthetic failure'}}]
            }):
                self.assertFalse(run_migration.run_migration(path))


if __name__ == '__main__':
    unittest.main()

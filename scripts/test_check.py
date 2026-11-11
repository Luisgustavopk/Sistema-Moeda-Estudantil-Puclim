"""Offline regression tests for runner failures, isolation and report accuracy."""

from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("puclim_check", Path(__file__).with_name("check.py"))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class CheckTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="puclim checks with spaces ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.addCleanup(patch.stopall)
        patch.object(runner, "ROOT", self.root).start()
        patch.object(runner, "environment", return_value={}).start()
        previous_umask = os.umask(0o077)
        self.addCleanup(os.umask, previous_umask)
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()

    def call(self, *args):
        with redirect_stdout(self.stdout), redirect_stderr(self.stderr):
            return runner.main(list(args))

    def source(self, area, name):
        path = self.root / "backend/src/test/java/example" / area / f"{name}.java"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()

    def test_integration_cannot_succeed_by_silently_skipping_without_database(self):
        self.source("integration", "HistoryIntegrationTest")
        with self.assertRaisesRegex(ValueError, "TEST_DB_URL"):
            runner.require_database("HistoryIntegrationTest", {})
        self.source("unit", "CpfValidationTest")
        with self.assertRaisesRegex(ValueError, "banco dedicado"):
            runner.require_database("*Test", {})
        runner.require_database("CpfValidationTest#acceptsValid", {})

    def test_unknown_selector_is_an_error(self):
        with self.assertRaisesRegex(ValueError, "Nenhuma classe"):
            runner.require_database("TypoTest", {})

    def test_nonzero_exit_is_preserved_and_log_contents_stay_out_of_summary(self):
        secret = "PRIVATE_SENTINEL"
        command = [sys.executable, "-c", f"print('{secret}'); raise SystemExit(7)"]
        with patch.object(runner, "plan", return_value=[("fake", command, self.root)]):
            self.assertEqual(1, self.call("frontend"))
        report = json.loads(next(self.root.glob(".cache/checks/*/summary.json")).read_text())
        self.assertFalse(report["success"])
        self.assertEqual(7, report["results"][0]["exit_code"])
        self.assertNotIn(secret, self.stdout.getvalue())
        self.assertIn(secret, Path(report["results"][0]["log"]).read_text())

    def test_dry_run_does_not_execute_or_leave_a_report(self):
        command = [sys.executable, "-c", "raise SystemExit(9)"]
        with patch.object(runner, "plan", return_value=[("fake", command, self.root)]), \
                patch.object(runner, "run_step") as run:
            self.assertEqual(0, self.call("frontend", "--dry-run"))
            run.assert_not_called()
        self.assertEqual([], list(self.root.glob(".cache/checks/*")))
        self.assertEqual(command, json.loads(self.stdout.getvalue())["argv"])

    def test_each_java_run_has_fresh_reports_and_all_skipped_is_not_success(self):
        def java_plan(args, env, output):
            folder = output / "backend-build/surefire-reports"
            folder.mkdir(parents=True)
            (folder / "TEST-example.xml").write_text(
                f'<testsuite tests="2" skipped="{skipped}" failures="0" errors="0"/>')
            return [("backend", [sys.executable, "-c", "pass"], self.root)]

        with patch.object(runner, "plan", side_effect=java_plan):
            skipped = 0
            self.assertEqual(0, self.call("backend", "--tests", "ExampleTest"))
            skipped = 2
            self.assertEqual(1, self.call("backend", "--tests", "ExampleTest"))
        reports = list(self.root.glob(".cache/checks/*/summary.json"))
        self.assertEqual(2, len(reports))
        self.assertEqual({False, True}, {json.loads(p.read_text())["success"] for p in reports})

    def test_live_requires_explicit_target_and_respects_selected_spec(self):
        path = self.root / "frontend/tests/history.live.spec.ts"
        path.parent.mkdir(parents=True)
        path.touch()
        args = runner.parser().parse_args(["e2e", path.name, "--live"])
        with patch.object(runner, "require_frontend", return_value="npm"):
            with self.assertRaisesRegex(ValueError, "LIVE_API_TARGET"):
                runner.plan(args, {}, self.root)
            env = {"LIVE_API_TARGET": "http://127.0.0.1:8086", "PLAYWRIGHT_LIVE_PORT": "5432"}
            steps = runner.plan(args, env, self.root)
        self.assertIn("test:e2e:live", steps[0][1])
        self.assertIn(path.name, steps[0][1])
        self.assertEqual("5432", env["PLAYWRIGHT_LIVE_PORT"])

    def test_browser_failure_is_not_hidden_by_exit_zero(self):
        def browser_plan(args, env, output):
            (output / "playwright.json").write_text(json.dumps({
                "stats": {"expected": 1, "unexpected": 1, "flaky": 0, "skipped": 2}}))
            return [("e2e", [sys.executable, "-c", "pass"], self.root)]

        with patch.object(runner, "plan", side_effect=browser_plan):
            self.assertEqual(1, self.call("e2e", "example.spec.ts"))
        self.assertIn("1 falhas", self.stdout.getvalue())

    def test_preflight_failure_does_not_launch_anything(self):
        with patch.object(runner, "plan", side_effect=ValueError("Ferramenta ausente")), \
                patch.object(runner, "run_step") as run:
            self.assertEqual(2, self.call("frontend"))
            run.assert_not_called()
        self.assertIn("Ferramenta ausente", self.stderr.getvalue())
        self.assertEqual([], list(self.root.glob(".cache/checks/*")))


if __name__ == "__main__":
    unittest.main()

"""Run actual security module with a minimal Frappe boundary, no provider accounts."""
import datetime
import importlib.util
import pathlib
import types
import unittest
from unittest.mock import patch

path = pathlib.Path(__file__).parents[1] / 'each_backend' / 'security.py'
# Other connector tests already supply isolated Frappe and API stubs.
from each_backend import api
import frappe
spec = importlib.util.spec_from_file_location('tested_security', path)
security = importlib.util.module_from_spec(spec)
# _workspace_name is imported at module load; supply it just for this load.
with patch.object(api, '_workspace_name', lambda user: 'owned-workspace', create=True):
    spec.loader.exec_module(security)


class SecurityTests(unittest.TestCase):
    def test_guest_is_refused_before_any_database_read(self):
        with patch.object(security, '_require_user', side_effect=ValueError('Authentication required')):
            with self.assertRaisesRegex(ValueError, 'Authentication required'):
                security.posture()

    def test_posture_reads_only_owner_audit_and_reports_policy_not_enrollment(self):
        seen = {}
        def rows(table, **kwargs):
            seen.update(kwargs)
            return [types.SimpleNamespace(content=security.PREFIX + '{"action":"workspace_saved"}', creation='2026-10-05'), types.SimpleNamespace(content='malformed', creation='now')]
        with patch.object(security, '_require_user', return_value='owner@example.test'), patch.object(security, '_workspace_name', return_value='owned-workspace'), patch.object(frappe, 'get_all', rows, create=True), patch.object(frappe, 'db', types.SimpleNamespace(get_single_value=lambda *args: 1), create=True), patch.object(frappe, 'utils', types.SimpleNamespace(now_datetime=lambda: datetime.datetime(2026,10,5)), create=True):
            result = security.posture()
        self.assertEqual(seen['filters']['reference_name'], 'owned-workspace')
        self.assertEqual(seen['limit_page_length'], 50)
        self.assertTrue(result['twoFactorPolicy'])
        self.assertEqual(result['audit'], [{'at': '2026-10-05', 'action': 'workspace_saved'}])
        self.assertNotIn('enrolled', result)

    def test_server_generated_event_contains_no_workspace_values(self):
        captured = []
        security.record_workspace_save(types.SimpleNamespace(add_comment=lambda *args: captured.append(args)))
        self.assertEqual(captured, [('Info', 'EACH security: {"action":"workspace_saved"}')])

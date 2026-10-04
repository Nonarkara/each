"""Connector tests with synthetic provider responses; no credentials or Frappe site."""
import contextlib
import copy
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from unittest.mock import patch

root = pathlib.Path(__file__).parents[1] / 'each_backend'
package = types.ModuleType('each_backend')
package.__path__ = [str(root)]
sys.modules['each_backend'] = package
frappe = types.ModuleType('frappe')
frappe.whitelist = lambda **kwargs: lambda fn: fn
frappe.session = types.SimpleNamespace(user='founder@example.test')
frappe.conf = {}
frappe.throw = lambda message: (_ for _ in ()).throw(ValueError(message))
frappe.cache = lambda: types.SimpleNamespace(lock=lambda *args, **kwargs: contextlib.nullcontext())
sys.modules['frappe'] = frappe
limiter = types.ModuleType('frappe.rate_limiter')
limiter.rate_limit = lambda **kwargs: lambda fn: fn
sys.modules['frappe.rate_limiter'] = limiter
api = types.ModuleType('each_backend.api')
def require_user():
    if frappe.session.user == 'Guest':
        raise ValueError('Authentication required')
    return frappe.session.user
api._require_user = require_user
sys.modules['each_backend.api'] = api
if importlib.util.find_spec('requests') is None:
    sys.modules['requests'] = types.ModuleType('requests')
from each_backend import mirrors, mirror_codec


class Response:
    ok = True
    content = b'{}'
    def __init__(self, body):
        self.body = body
    def json(self):
        return self.body


class ProviderSession:
    def __init__(self, tabs):
        self.tabs = copy.deepcopy(tabs)
        self.writes = 0
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def post(self, url, json, timeout):
        self.writes += 1
        if json['valueInputOption'] != 'RAW':
            raise AssertionError('Formula execution must stay disabled')
        self.tabs = {item['range'].split("'")[1]: item['values'] for item in json['data']}
        return Response({})
    def patch(self, url, json, timeout):
        self.writes += 1
        name = url.split('/worksheets/')[1].split('/')[0]
        self.tabs[name] = json['values']
        return Response({})


class ConnectorTests(unittest.TestCase):
    def setUp(self):
        frappe.session.user = 'founder@example.test'
        frappe.conf = {'each_mirrors': {'founder@example.test': {'google': {'spreadsheet_id': 'synthetic'}, 'microsoft': {'drive_id': 'd', 'item_id': 'i'}}}}
        self.state = {'onboarded': True, 'company': None, 'companyName': 'Example', 'currency': 'THB', 'asOf': '2026-10-05', 'gmailConnected': False, 'gmailImported': 0, **{key: [] for key in mirror_codec.HEADERS}}
        frappe.db = types.SimpleNamespace(get_value=lambda table, selector, field=None: json.dumps(self.state) if field == 'state_json' else 'workspace')
        self.tabs = mirror_codec.to_tabs(self.state)

    def test_account_mapping_cannot_be_selected_by_the_client(self):
        self.assertTrue(mirrors.status()['google'])
        frappe.session.user = 'another@example.test'
        self.assertEqual(mirrors.status(), {'google': False, 'microsoft': False})
        with self.assertRaisesRegex(ValueError, 'not connected'):
            mirrors._config('google')
        frappe.session.user = 'Guest'
        with self.assertRaisesRegex(ValueError, 'Authentication required'):
            mirrors.status()

    def test_revision_conflict_blocks_all_provider_writes(self):
        session = ProviderSession(self.tabs)
        with patch.object(mirrors, '_session', return_value=session), patch.object(mirrors, '_read', side_effect=lambda *args: copy.deepcopy(session.tabs)):
            with self.assertRaisesRegex(ValueError, 'changed'):
                mirrors.write('google', json.dumps(self.state), 'stale-revision')
        self.assertEqual(session.writes, 0)

    def test_only_database_saved_state_can_be_sent(self):
        changed = {**self.state, 'companyName': 'Unsaved'}
        with self.assertRaisesRegex(ValueError, 'pending'):
            mirrors.write('google', json.dumps(changed), mirror_codec.revision(self.tabs))

    def test_both_providers_clear_removed_rows_and_verify_read_back(self):
        for provider in ('google', 'microsoft'):
            tabs = copy.deepcopy(self.tabs)
            headers = mirror_codec.HEADERS['expenses']
            tabs['expenses'].append(['remove-me', '2026-10-05', 'Example', 'Office', 'opex', 10, 'THB', 'Synthetic', 'Founder'])
            self.assertEqual(len(headers), len(tabs['expenses'][1]))
            session = ProviderSession(tabs)
            with patch.object(mirrors, '_session', return_value=session), patch.object(mirrors, '_read', side_effect=lambda *args: copy.deepcopy(session.tabs)):
                result = mirrors.write(provider, json.dumps(self.state), mirror_codec.revision(tabs))
            self.assertTrue(result['verified'])
            self.assertEqual(mirror_codec.from_tabs(mirrors._trim(session.tabs)), self.state)
            self.assertGreater(session.writes, 0)

    def test_unconfirmed_write_is_never_reported_verified(self):
        session = ProviderSession(self.tabs)
        altered = copy.deepcopy(self.tabs)
        altered['Metadata'] = [[*row] for row in altered['Metadata']]
        for row in altered['Metadata']:
            if row[0] == 'companyName':
                row[1] = 'Concurrent edit'
        with patch.object(mirrors, '_session', return_value=session), patch.object(mirrors, '_read', side_effect=[copy.deepcopy(self.tabs), altered]):
            with self.assertRaisesRegex(ValueError, 'could not be verified'):
                mirrors.write('google', json.dumps(self.state), mirror_codec.revision(self.tabs))


if __name__ == '__main__':
    unittest.main()

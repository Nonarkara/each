import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).parents[1] / 'each_backend' / 'mirror_codec.py'
spec = importlib.util.spec_from_file_location('mirror_codec', path)
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)


class MirrorCodecTests(unittest.TestCase):
    def state(self):
        return {
            'onboarded': True, 'company': None, 'companyName': 'บริษัท Example',
            'currency': 'THB', 'asOf': '2026-10-05', 'gmailConnected': False, 'gmailImported': 0,
            **{key: [] for key in codec.HEADERS},
            'expenses': [{'id': '001', 'date': '2026-10-05', 'vendor': '=HYPERLINK("bad")',
                          'category': 'Office', 'type': 'opex', 'amount': 0, 'currency': 'THB', 'source': 'Test', 'owner': 'Test'}],
            'projects': [{'id': 'p', 'title': 'ทดสอบ', 'status': 'backlog', 'owner': 'Test',
                          'checklist': [{'k': 'Review', 'done': False}], 'notes': [], 'files': []}],
        }

    def test_round_trip(self):
        state = self.state()
        tabs = codec.to_tabs(state)
        self.assertTrue(tabs['expenses'][1][2].startswith("'="))
        self.assertEqual(codec.from_tabs(tabs), state)

    def test_revision_changes_on_remote_edit(self):
        tabs = codec.to_tabs(self.state())
        first = codec.revision(tabs)
        tabs['expenses'][1][5] = 120
        self.assertNotEqual(first, codec.revision(tabs))

    def test_missing_tab_and_duplicate_id_are_refused(self):
        tabs = codec.to_tabs(self.state())
        tabs['expenses'].append(tabs['expenses'][1])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            codec.from_tabs(tabs)
        del tabs['employees']
        with self.assertRaisesRegex(ValueError, 'missing'):
            codec.from_tabs(tabs)

    def test_unsafe_metadata_and_headers_are_refused(self):
        tabs = codec.to_tabs(self.state())
        tabs['Metadata'].append(['__proto__', '{}'])
        with self.assertRaisesRegex(ValueError, 'metadata'):
            codec.from_tabs(tabs)
        tabs = codec.to_tabs(self.state())
        tabs['expenses'][0] = ['id', '__proto__']
        with self.assertRaisesRegex(ValueError, 'headers'):
            codec.from_tabs(tabs)


if __name__ == '__main__':
    unittest.main()

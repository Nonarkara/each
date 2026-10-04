"""Authenticated Google Sheets / Microsoft Graph mirror connectors.

Each user's configured destination is selected on the server. Credentials are
read from named environment variables and never returned to the browser.
Transfers are explicit and verified; cloud coauthoring must pause during writes.
"""
import json
import os
import re
from urllib.parse import quote

import frappe
import requests
from frappe.rate_limiter import rate_limit

from .api import _require_user
from .mirror_codec import HEADERS, from_tabs, revision, to_tabs


def _config(provider):
    user = _require_user()
    if provider not in ('google', 'microsoft'):
        frappe.throw('Unknown mirror provider')
    config = (frappe.conf.get('each_mirrors') or {}).get(user, {}).get(provider)
    if not isinstance(config, dict):
        frappe.throw('Your administrator has not connected this mirror')
    return config


def _json(response):
    # Provider error bodies may contain credentials or private workbook data.
    if not response.ok:
        frappe.throw('Spreadsheet provider request failed (HTTP {0})'.format(response.status_code))
    if len(response.content) > 4_000_000:
        frappe.throw('Workbook response exceeds the 4 MB limit')
    return response.json()


def _session(provider, config):
    if provider == 'google':
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
        raw = os.environ.get(config.get('credentials_env', ''), '')
        if not raw:
            frappe.throw('Google credentials are not configured on the server')
        credentials = service_account.Credentials.from_service_account_info(
            json.loads(raw), scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        return AuthorizedSession(credentials)
    # Excel workbook APIs require delegated permissions, not app-only tokens.
    token = os.environ.get(config.get('access_token_env', ''), '')
    if not token:
        frappe.throw('Microsoft delegated access token is not configured on the server')
    session = requests.Session()
    session.headers['Authorization'] = 'Bearer ' + token
    return session


def _base(provider, config):
    if provider == 'google':
        identifier = config.get('spreadsheet_id', '')
        if not re.fullmatch(r'[A-Za-z0-9_-]+', identifier):
            frappe.throw('Invalid Google spreadsheet ID')
        return 'https://sheets.googleapis.com/v4/spreadsheets/' + identifier
    drive, item = config.get('drive_id', ''), config.get('item_id', '')
    if not drive or not item:
        frappe.throw('Configure Microsoft drive and workbook IDs')
    return 'https://graph.microsoft.com/v1.0/drives/' + quote(drive, safe='') + '/items/' + quote(item, safe='') + '/workbook'


def _read(session, provider, base):
    names = ['Metadata', *HEADERS]
    if provider == 'google':
        ranges = _json(session.get(base + '/values:batchGet', params=[
            *[('ranges', "'" + n + "'!A1:AD10002") for n in names],
            ('valueRenderOption', 'UNFORMATTED_VALUE'), ('dateTimeRenderOption', 'FORMATTED_STRING')
        ], timeout=30)).get('valueRanges', [])
        if len(ranges) != len(names):
            frappe.throw('Missing EACH workbook tabs')
        return {n: r.get('values', []) for n, r in zip(names, ranges)}
    tabs = {}
    for name in names:
        result = _json(session.get(base + '/worksheets/' + quote(name, safe='') + '/usedRange(valuesOnly=true)', timeout=30))
        if result.get('rowCount', 0) > 10001 or result.get('columnCount', 0) > 30 or result.get('rowIndex', 0) != 0 or result.get('columnIndex', 0) != 0:
            frappe.throw('Oversized or shifted workbook range')
        tabs[name] = result.get('values', [])
    return tabs


def _trim(tabs):
    # Graph returns rectangular ranges; Google omits trailing blank cells.
    for rows in tabs.values():
        for row in rows:
            while row and row[-1] in ('', None):
                row.pop()
        while rows and not rows[-1]:
            rows.pop()
    return tabs


@frappe.whitelist(methods=['GET'])
def status():
    user = _require_user()
    config = (frappe.conf.get('each_mirrors') or {}).get(user, {})
    return {provider: isinstance(config.get(provider), dict) for provider in ('google', 'microsoft')}


@frappe.whitelist(methods=['POST'])
@rate_limit(limit=20, seconds=60)
def read(provider):
    config = _config(provider)
    with _session(provider, config) as session:
        tabs = _trim(_read(session, provider, _base(provider, config)))
    state = from_tabs(tabs)
    return {'state': state, 'revision': revision(tabs)}


@frappe.whitelist(methods=['POST'])
@rate_limit(limit=10, seconds=60)
def write(provider, state, expected_revision):
    config = _config(provider)
    if not isinstance(state, str) or len(state.encode()) > 2_000_000:
        frappe.throw('Workspace exceeds the 2 MB limit')
    parsed = json.loads(state)
    # Validate the transferable schema before any provider writes.
    next_tabs = to_tabs(parsed)
    from_tabs(next_tabs)
    name = frappe.db.get_value('EACH Workspace', {'owner_user': _require_user()}, 'name')
    if not name:
        frappe.throw('Save your authenticated database workspace before mirroring')
    saved = json.loads(frappe.db.get_value('EACH Workspace', name, 'state_json'))
    if parsed != saved:
        frappe.throw('Save pending workspace changes to the database before mirroring')
    lock_name = 'each-mirror:' + provider + ':' + _base(provider, config)
    with frappe.cache().lock(lock_name, timeout=300, blocking_timeout=5):
        with _session(provider, config) as session:
            base = _base(provider, config)
            before = _trim(_read(session, provider, base))
            if revision(before) != expected_revision:
                frappe.throw('Spreadsheet changed. Read and review it again before sending.')
            matrices = {}
            for tab, rows in next_tabs.items():
                width = max(len(rows[0]), max((len(r) for r in before[tab]), default=0))
                height = max(len(rows), len(before[tab]))
                matrices[tab] = [list(rows[i]) + [''] * (width - len(rows[i])) if i < len(rows) else [''] * width for i in range(height)]
            if provider == 'google':
                _json(session.post(base + '/values:batchUpdate', json={
                    'valueInputOption': 'RAW',
                    'data': [{'range': "'" + tab + "'!A1", 'values': rows} for tab, rows in matrices.items()]
                }, timeout=60))
            else:
                for tab, rows in matrices.items():
                    width = len(rows[0])
                    end_column = chr(64 + width) if width <= 26 else 'A' + chr(64 + width - 26)
                    address = 'A1:' + end_column + str(len(rows))
                    _json(session.patch(base + '/worksheets/' + quote(tab, safe='') + "/range(address='" + address + "')", json={'values': rows}, timeout=30))
            confirmed = _trim(_read(session, provider, base))
            if from_tabs(confirmed) != from_tabs(next_tabs):
                frappe.throw('Mirror write could not be verified. Review the remote workbook before retrying.')
    return {'verified': True, 'revision': revision(confirmed)}

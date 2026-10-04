"""Pure mirror codec: editable columns, explicit schema, no executable formulas."""
import hashlib
import json
import math
import re

HEADERS = {
    'foundingCapital': ['id', 'source', 'taxId', 'amount', 'currency', 'date', 'note'],
    'expenses': ['id', 'date', 'vendor', 'category', 'type', 'amount', 'currency', 'source', 'owner'],
    'employees': ['id', 'name', 'role', 'salary', 'currency', 'started'],
    'aiEmployees': ['id', 'name', 'vendor', 'role', 'plan', 'cost', 'currency', 'efficiency', 'started'],
    'projects': ['id', 'title', 'status', 'owner', 'client', 'clientId', 'totalValue', 'received', 'taxDeducted', 'receivedDate', 'dealStatus', 'scenarioTier', 'currency', 'checklist', 'notes', 'files'],
    'loans': ['id', 'lender', 'principal', 'rate', 'termMonths', 'installment', 'currency', 'startDate', 'note'],
    'objectives': ['id', 'objective', 'keyResults', 'quarter'],
    'actions': ['id', 'priority', 'label', 'module', 'done'],
    'recurringExpenses': ['id', 'name', 'amount', 'currency'],
    'intakeReceipts': ['id', 'name', 'sha256', 'approvedAt', 'provider', 'summary', 'records'],
}
REQUIRED_TEXT = {'foundingCapital': ['source', 'taxId', 'date'], 'expenses': ['date', 'vendor', 'category', 'type', 'currency', 'source', 'owner'], 'employees': ['name', 'role', 'currency', 'started'], 'aiEmployees': ['name', 'vendor', 'role', 'plan', 'currency', 'started'], 'projects': ['title', 'status', 'owner'], 'loans': ['lender', 'currency', 'startDate'], 'objectives': ['objective'], 'actions': ['priority', 'label', 'module'], 'recurringExpenses': ['name', 'currency']}
METADATA = {'onboarded', 'company', 'companyName', 'currency', 'asOf', 'gmailConnected', 'gmailImported', 'dataTenant', 'schemaVersion', 'fxRates'}


def safe_cell(value):
    if value is None:
        return ''
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    if isinstance(value, str) and re.match(r'^\s*[=+@-]', value):
        return "'" + value
    return value


def decode_cell(value):
    if isinstance(value, (dict, list)):
        raise ValueError('Paste values, not rich cells')
    if isinstance(value, float) and not math.isfinite(value):
        raise ValueError('Invalid number')
    if isinstance(value, str):
        if value.startswith("'") and re.match(r'^\s*[=+@-]', value[1:]):
            value = value[1:]
        if value.startswith(('{', '[')) or value == 'null':
            return json.loads(value)
    return value


def to_tabs(state):
    tabs = {'Metadata': [['key', 'value']]}
    for key in sorted(METADATA):
        if key in state:
            tabs['Metadata'].append([key, 'null' if state[key] is None else safe_cell(state[key])])
    for key, headers in HEADERS.items():
        tabs[key] = [headers] + [[safe_cell(row.get(h)) for h in headers] for row in state.get(key, [])]
    return tabs


def from_tabs(tabs):
    if set(tabs) != set(HEADERS) | {'Metadata'}:
        raise ValueError('Upload an EACH workbook first; required tabs are missing')
    state = {}
    for row in tabs['Metadata'][1:]:
        if not row or all(x in ('', None) for x in row):
            continue
        key = row[0]
        if key not in METADATA or key in state:
            raise ValueError('Invalid or duplicate metadata')
        state[key] = decode_cell(row[1] if len(row) > 1 else '')
    for key, headers in HEADERS.items():
        values = tabs[key]
        if not values or values[0] != headers or len(values) > 10001:
            raise ValueError('Invalid headers or too many rows: ' + key)
        rows = []
        ids = set()
        for row in values[1:]:
            if not row or all(x in ('', None) for x in row):
                continue
            record = {h: decode_cell(row[i]) for i, h in enumerate(headers) if i < len(row) and row[i] not in ('', None)}
            for field in REQUIRED_TEXT.get(key, []):
                record.setdefault(field, '')
            record_id = record.get('id')
            if not isinstance(record_id, str) or not record_id or record_id in ids:
                raise ValueError('Invalid or duplicate ID: ' + key)
            ids.add(record_id)
            rows.append(record)
        state[key] = rows
    return state


def revision(tabs):
    encoded = json.dumps(tabs, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    return hashlib.sha256(encoded.encode()).hexdigest()

"""Owner-scoped security evidence. No client-selected workspace or credentials."""
import json
import frappe
from each_backend.api import _require_user, _workspace_name

PREFIX = 'EACH security: '


def record_workspace_save(doc):
    # Server creates this event; client workspace JSON cannot supply audit entries.
    doc.add_comment('Info', PREFIX + json.dumps({'action': 'workspace_saved'}, separators=(',', ':')))


@frappe.whitelist(methods=['GET'])
def posture():
    user = _require_user()
    name = _workspace_name(user)
    events = []
    if name:
        rows = frappe.get_all('Comment', filters={'reference_doctype': 'EACH Workspace', 'reference_name': name, 'comment_type': 'Info', 'content': ['like', PREFIX + '%']}, fields=['creation', 'content'], order_by='creation desc', limit_page_length=50)
        for row in rows:
            try:
                value = json.loads(row.content.removeprefix(PREFIX))
                if value.get('action') == 'workspace_saved':
                    events.append({'at': str(row.creation), 'action': 'workspace_saved'})
            except (ValueError, AttributeError, TypeError):
                continue
    return {'checkedAt': frappe.utils.now_datetime().isoformat(), 'ownerIsolation': True, 'twoFactorPolicy': frappe.db.get_single_value('System Settings', 'enable_two_factor_auth') in (1, '1'), 'audit': events}

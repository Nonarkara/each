import json

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit


def _require_user() -> str:
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required"), frappe.AuthenticationError)
    return user


def _workspace_name(user: str) -> str | None:
    return frappe.db.get_value("EACH Workspace", {"owner_user": user}, "name")


@frappe.whitelist()
def get_state():
    user = _require_user()
    name = _workspace_name(user)
    if not name:
        return None
    raw = frappe.db.get_value("EACH Workspace", name, "state_json")
    return json.loads(raw) if raw else None


@frappe.whitelist(methods=["POST"])
def put_state(state):
    user = _require_user()
    if isinstance(state, str) and len(state.encode("utf-8")) > 2_000_000:
        frappe.throw(_("Workspace exceeds the 2 MB limit"))
    parsed = json.loads(state) if isinstance(state, str) else state
    if not isinstance(parsed, dict):
        frappe.throw(_("State must be a JSON object"))
    if parsed.get("dataTenant") == "abc" or not parsed.get("onboarded"):
        frappe.throw(_("Demo and reset data cannot overwrite a database workspace"))
    for key in ("foundingCapital", "expenses", "employees", "aiEmployees", "projects", "objectives", "actions", "loans"):
        rows = parsed.get(key)
        if not isinstance(rows, list) or len(rows) > 10000 or any(not isinstance(row, dict) for row in rows):
            frappe.throw(_("Invalid workspace collection: {0}").format(key))

    encoded = json.dumps(parsed, separators=(",", ":"), ensure_ascii=False)
    if len(encoded.encode("utf-8")) > 2_000_000:
        frappe.throw(_("Workspace exceeds the 2 MB limit"))
    name = _workspace_name(user)
    if name:
        doc = frappe.get_doc("EACH Workspace", name)
        doc.state_json = encoded
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "EACH Workspace",
                "owner_user": user,
                "state_json": encoded,
            }
        )
        doc.insert(ignore_permissions=True)

    return parsed


@frappe.whitelist()
def health():
    return {
        "ok": True,
        "site": frappe.local.site,
        "database": frappe.conf.db_type or "mariadb",
    }


@frappe.whitelist(methods=["GET"])
def session_info():
    user = _require_user()
    from frappe.sessions import get_csrf_token
    return {"user": user, "csrf_token": get_csrf_token()}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60)
def verify_google(credential):
    """Verify identity and Axiom entitlement server-side; never accept decoded claims."""
    from google.auth.transport.requests import Request
    from google.oauth2 import id_token

    client_id = frappe.conf.get("each_google_client_id")
    allowed = frappe.conf.get("each_axiom_allowed_emails") or []
    if not client_id or not isinstance(allowed, list) or not allowed:
        frappe.throw(_("Google sign-in is not configured"), frappe.AuthenticationError)
    if not isinstance(credential, str) or len(credential) > 16000:
        frappe.throw(_("Invalid credential"), frappe.AuthenticationError)
    try:
        claims = id_token.verify_oauth2_token(credential, Request(), client_id)
    except Exception:
        # Do not log credential or provider response details.
        raise frappe.AuthenticationError("Google credential verification failed") from None
    email = claims.get("email", "").lower()
    if claims.get("email_verified") is not True or email not in [str(item).lower() for item in allowed]:
        frappe.throw(_("Workspace access denied"), frappe.AuthenticationError)
    return {"email": email, "name": claims.get("name", email), "dataPath": "axiom"}

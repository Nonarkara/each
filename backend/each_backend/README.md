# EACH Backend

Small Frappe app that persists one JSON workspace per authenticated EACH user.
It is deliberately a bridge: the React UI keeps using `src/lib/store.ts`, while
Frappe provides authentication, MariaDB persistence, permissions, and backups.

Later migrations can map workspace fields to native ERPNext, Frappe HR, and
Frappe CRM DocTypes without changing the UI component contracts.

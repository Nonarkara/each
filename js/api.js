/* api.js — API shim. Mutations go to the local store, then fan-out to:
   - D1 cache (window.Sync, debounced 1.2s)
   - Google Sheet (window.SheetsSync, debounced 1.2s) — only if configured
   The sheets write is no-op until the user pastes a Web App URL in Settings. */
(function (global) {
  'use strict';
  const D = window.Data;
  const uid = D.uid;

  function syncToGoogleSheets(state) {
    if (!window.SheetsSync || !window.SheetsSync.isConfigured()) return;
    window.SheetsSync.scheduleSave(state);
  }

  function set(fn) {
    D.Store.update(st => {
      const next = fn(st) || st;
      syncToGoogleSheets(next);
      return next;
    });
  }

  global.API = {
    // ---- HR ----
    addAI: (ai) => set(s => { s.aiEmployees.push(Object.assign({ id: uid() }, ai)); return s; }),
    removeAI: (id) => set(s => { s.aiEmployees = s.aiEmployees.filter(x => x.id !== id); return s; }),
    addHuman: (h) => set(s => { s.employees.push(Object.assign({ id: uid() }, h)); return s; }),
    removeHuman: (id) => set(s => { s.employees = s.employees.filter(x => x.id !== id); return s; }),

    // ---- CRM ----
    addProject: (p) => set(s => { s.projects.push(Object.assign({ id: uid(), status: 'backlog', owner: 'Founder', checklist: [], notes: [], files: [] }, p)); return s; }),
    updateProject: (id, patch) => set(s => { const p = s.projects.find(x => x.id === id); if (p) Object.assign(p, patch); return s; }),
    removeProject: (id) => set(s => { s.projects = s.projects.filter(x => x.id !== id); return s; }),
    addProjectFile: (id, name) => set(s => { const p = s.projects.find(x => x.id === id); if (p) p.files.push(name); return s; }),
    addProjectNote: (id, t, at) => set(s => { const p = s.projects.find(x => x.id === id); if (p) p.notes.unshift({ t, at }); return s; }),
    toggleProjectTask: (id, taskIdx, done) => set(s => { const p = s.projects.find(x => x.id === id); if (p) p.checklist[taskIdx].done = done; return s; }),
    addProjectTask: (id, k) => set(s => { const p = s.projects.find(x => x.id === id); if (p) p.checklist.push({ k, done: false }); return s; }),
    receiveProjectRevenue: (id, amount) => set(s => { const p = s.projects.find(x => x.id === id); if (p) { p.received = (Number(p.received) || 0) + amount; p.receivedDate = new Date().toISOString().slice(0,10); } return s; }),

    // ---- ERP ----
    addExpense: (e) => set(s => { s.expenses.push(Object.assign({ id: uid() }, e)); return s; }),
    removeExpense: (id) => set(s => { s.expenses = s.expenses.filter(x => x.id !== id); return s; }),

    // ---- OKR ----
    toggleOKRTask: (id, taskIdx, done) => set(s => { const o = s.objectives.find(x => x.id === id); if (o) o.keyResults[taskIdx].done = done; return s; }),

    // ---- Accounting ----
    addJournalEntry: (tx) => set(s => { s.journal.push(Object.assign({ id: uid(), auto: false }, tx)); return s; }),
    syncJournal: () => set(s => { window.Accounting.sync(s); return s; })
  };
})(window);

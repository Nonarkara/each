/* crm.js — Projects pillar. Kanban, checklists, file logs, AI ideas, customer pings. */
(function () {
  'use strict';
  const { el, station } = window.UI;
  const D = window.Data;

  const COLS = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'doing', label: 'In progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ];
  let dragId = null;

  function render(s, remount) {
    const wrap = el('div', null);
    const bookValue = s.projects.reduce((a, p) => a + (Number(p.totalValue) || 0), 0);
    wrap.appendChild(station('P', 'PILLAR 03 · PROJECTS', 'Projects', 'Kanban · ' + s.projects.length + ' · ' + D.compact(bookValue, s.currency) + ' book'));

    wrap.appendChild(aiSuggestions(s, remount));

    const board = el('div.kanban');
    COLS.forEach(col => {
      const body = el('div.kcol-body.kdrop', {
        ondragover: (e) => { e.preventDefault(); body.classList.add('over'); },
        ondragleave: () => body.classList.remove('over'),
        ondrop: (e) => {
          e.preventDefault(); body.classList.remove('over');
          if (!dragId) return;
          API.updateProject(dragId, { status: col.id });
          dragId = null; remount();
        }
      });
      const cards = s.projects.filter(p => p.status === col.id);
      cards.forEach(p => body.appendChild(card(p, s, remount)));
      if (!cards.length) body.appendChild(el('div.empty', { text: '—', style: 'padding:14px' }));

      board.appendChild(el('div.kcol', null,
        el('div.kcol-head', null,
          el('span.label', { text: col.label }),
          el('span.micro', { text: cards.length })),
        body));
    });

    wrap.appendChild(el('div', { style: 'margin-bottom:14px' }, board));
    wrap.appendChild(addBar(s, remount));
    return wrap;
  }

  function card(p, s, remount) {
    const done = (p.checklist || []).filter(c => c.done).length;
    const tot = (p.checklist || []).length;
    const deal = p.dealStatus === 'commissioned';
    const collectPct = (deal && p.totalValue) ? Math.min(100, (p.received / p.totalValue) * 100) : 0;
    const c = el('div.kcard', {
      draggable: 'true',
      onclick: (e) => { if (e.target.tagName !== 'INPUT') openDetail(p, s, remount); },
      ondragstart: () => { dragId = p.id; c.classList.add('dragging'); },
      ondragend: () => c.classList.remove('dragging'),
    },
      el('div.row.between', null,
        el('div.title', { text: p.title, style: 'flex:1' }),
        p.totalValue ? el('span.t-value', { text: D.compact(p.totalValue, s.currency) }) : null),
      p.client ? el('div.micro', { text: p.client, style: 'margin-top:2px' }) : null,
      el('div.row-c.gap-s', { style: 'margin-top:8px' },
        p.dealStatus
          ? el('span.tag-chip' + (deal ? '' : '.human'), { text: deal ? 'Commissioned' : 'Pipeline · T' + (p.scenarioTier || '?') })
          : null,
        el('span.micro', { text: tot ? (done + '/' + tot + ' tasks') : 'No tasks' }),
        p.files && p.files.length ? el('span.micro', { text: p.files.length + ' files' }) : null),
      deal && p.totalValue ? el('div', { style: 'margin-top:8px' }, bar(collectPct, 'blue'),
        el('div.micro', { text: D.money(p.received || 0, s.currency) + ' of ' + D.money(p.totalValue, s.currency) + ' collected', style: 'margin-top:3px' })) : null);
    return c;
  }
  /* Card detail — checklist, files, notes. The AI offers ideas. */
  function openDetail(p, s, remount) {
    const refresh = () => { m.close(); openDetail(Data.Store.get().projects.find(x => x.id === p.id), Data.Store.get(), remount); };

    const checklist = el('ul.check');
    function drawCheck() {
      UI.clear(checklist);
      (p.checklist || []).forEach((c, i) => checklist.appendChild(
        el('li' + (c.done ? '.done' : ''), null,
          el('input', { type: 'checkbox', checked: c.done ? 'checked' : null,
            onclick: (e) => { API.toggleProjectTask(p.id, i, e.target.checked); refresh(); } }),
          c.k)));
    }
    drawCheck();

    const newTask = el('input.input', { placeholder: 'Add a task', style: 'margin-top:8px',
      onkeydown: (e) => { if (e.key === 'Enter' && newTask.value.trim()) { API.addProjectTask(p.id, newTask.value.trim()); refresh(); } } });

    const fileList = el('div.stack.gap-s');
    function drawFiles() {
      UI.clear(fileList);
      (p.files || []).forEach(f => fileList.appendChild(el('div.row.between', null, el('span.t-body', { text: f }), el('span.micro', { text: 'uploaded' }))));
      if (!(p.files || []).length) fileList.appendChild(el('div.empty', { text: 'No files.' }));
    }
    drawFiles();
    const upload = el('button.btn.ghost.sm', { text: '+ Upload file', onclick: () => {
      const name = prompt('File name to attach:');
      if (name) { API.addProjectFile(p.id, name); refresh(); }
    }});

    const noteList = el('div.stack.gap-s');
    function drawNotes() {
      UI.clear(noteList);
      (p.notes || []).forEach(n => noteList.appendChild(el('div.note-callout', null,
        el('div.micro', { text: n.at }), el('div.t-body', { text: n.t, style: 'margin-top:2px' }))));
      if (!(p.notes || []).length) noteList.appendChild(el('div.empty', { text: 'No notes yet.' }));
    }
    drawNotes();
    const noteInput = el('input.input', { placeholder: 'Log a note', style: 'margin-top:8px',
      onkeydown: (e) => { if (e.key === 'Enter' && noteInput.value.trim()) { API.addProjectNote(p.id, noteInput.value.trim(), new Date().toISOString().slice(0,10)); refresh(); } } });

    const ideas = el('div.ai-suggest', null, el('div.label', { text: 'AI read', style: 'margin-bottom:6px' }),
      el('div.meta', { text: ideaFor(p) }));

    const body = el('div.stack.gap-l', null,
      el('div', null, el('div.label', { text: 'Checklist' }), checklist, newTask),
      el('div.split-phi', null,
        el('div', null, el('div.label', { text: 'Files' }), fileList, upload),
        el('div', null, el('div.label', { text: 'Notes' }), noteList, noteInput)),
      ideas);

    const isCommissioned = p.dealStatus === 'commissioned';
    const out = (p.totalValue || 0) - (p.received || 0);
    const canInvoice = isCommissioned && out > 0;

    const m = UI.modal(p.title, body, [
      el('button.btn.ghost.red', { text: 'Delete', onclick: () => { if (confirm('Delete project?')) { API.removeProject(p.id); m.close(); remount(); } } }),
      canInvoice ? el('button.btn.blue', { text: 'Collect revenue', onclick: () => {
        const amt = prompt('Amount to collect (outstanding: ' + D.money(out, s.currency) + '):', out);
        if (amt && !isNaN(amt)) {
          const v = Number(amt);
          API.receiveProjectRevenue(p.id, v);
          API.addProjectNote(p.id, 'Collected ' + D.money(v, s.currency) + ' from client.', new Date().toISOString().slice(0,10));
          refresh();
        }
      } }) : null,
      el('button.btn.ghost', { text: 'To Backlog', onclick: () => { setStatus(p.id, 'backlog', remount); m.close(); } }),
      el('button.btn', { text: 'Close', onclick: () => m.close() }),
    ].filter(Boolean));
  }

  function ideaFor(p) {
    const done = (p.checklist || []).filter(c => c.done).length;
    const tot = (p.checklist || []).length;
    if (p.status === 'done') return 'Shipped. Capture the outcome in the investor dossier.';
    if (p.status === 'review') return 'In review. ' + (tot - done) + ' task(s) open. Schedule the sign-off.';
    if (tot && done === tot) return 'All tasks done. Move to review.';
    if (!tot) return 'No tasks defined. Break this into three concrete steps.';
    return done + ' of ' + tot + ' done. Next: ' + (p.checklist.find(c => !c.done) || {}).k + '.';
  }
  function setStatus(id, status, remount) {
    API.updateProject(id, { status });
    remount();
  }
  /* Board-wide AI reads — reference real clients, deals, outstanding revenue. */
  function aiSuggestions(s, remount) {
    const ideas = [];
    s.projects.forEach(p => {
      const v = p.totalValue ? D.compact(p.totalValue, s.currency) : '';
      if (p.dealStatus === 'pipeline' && p.scenarioTier === 2)
        ideas.push('"' + p.title + '" with ' + (p.client || 'the client') + ' is in pipeline (' + v + '). Follow up this week.');
      else if (p.dealStatus === 'pipeline' && p.scenarioTier === 3)
        ideas.push('"' + p.title + '" is a stretch (' + v + '). Qualify the opportunity before investing time.');
      else if (p.dealStatus === 'commissioned' && p.totalValue && (p.received || 0) < p.totalValue)
        ideas.push('"' + p.title + '": ' + D.compact(p.totalValue - (p.received || 0), s.currency) + ' outstanding. Schedule the next invoice.');
    });
    if (!ideas.length) ideas.push('Board is steady. No open reads.');
    const box = el('div.ai-suggest', { style: 'margin-bottom:18px' },
      el('div.row-c.gap-s', { style: 'margin-bottom:8px' }, el('span.disc.sm.ink', { text: 'A' }), el('span.label', { text: 'Operator reads' })));
    ideas.slice(0, 4).forEach(t => box.appendChild(el('div.t-body', { text: t, style: 'margin-top:4px' })));
    return box;
  }

  function addBar(s, remount) {
    const add = () => {
      const title = el('input.input', { placeholder: 'Project title' });
      const body = el('div.stack.gap-m', null, el('div.cell', null, el('span.label', { text: 'Title' }), title));
      const m = UI.modal('New project', body, [
        el('button.btn.ghost', { text: 'Cancel', onclick: () => m.close() }),
        el('button.btn', { text: 'Create', onclick: () => {
          if (!title.value) return;
          API.addProject({ title: title.value });
          m.close(); remount();
        } }) ]);
    };
    return el('div.row.gap-m', null,
      el('button.btn.ghost.sm', { text: '+ New project', onclick: add }),
      el('span.meta', { text: 'Drag cards between columns.' }));
  }

  window.CRM = { render };
})();



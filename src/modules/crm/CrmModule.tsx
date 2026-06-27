import { useState } from 'react'
import { compact, money, uid } from '../../lib/format'
import type { EachStore, Project, ProjectStatus } from '../../lib/types'
import type { storeApi } from '../../lib/store'
import {
  Btn,
  Empty,
  Input,
  Modal,
  ProgressBar,
  Station,
  TagChip,
} from '../../components/ui/Axiom'

const COLS: { id: ProjectStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'doing', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
]

interface CrmModuleProps {
  store: EachStore
  api: typeof storeApi
}

function ideaFor(p: Project): string {
  const done = (p.checklist || []).filter((c) => c.done).length
  const tot = (p.checklist || []).length
  if (p.status === 'done') return 'Shipped. Capture the outcome in the investor dossier.'
  if (p.status === 'review') return 'In review. ' + (tot - done) + ' task(s) open. Schedule the sign-off.'
  if (tot && done === tot) return 'All tasks done. Move to review.'
  if (!tot) return 'No tasks defined. Break this into three concrete steps.'
  return done + ' of ' + tot + ' done. Next: ' + (p.checklist.find((c) => !c.done) || {}).k + '.'
}

export function CrmModule({ store, api }: CrmModuleProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newNote, setNewNote] = useState('')

  const bookValue = store.projects.reduce((a, p) => a + (Number(p.totalValue) || 0), 0)
  const detail = detailId ? store.projects.find((p) => p.id === detailId) : null

  const ideas: string[] = []
  store.projects.forEach((p) => {
    const v = p.totalValue ? compact(p.totalValue, store.currency) : ''
    if (p.dealStatus === 'pipeline' && p.scenarioTier === 2)
      ideas.push('"' + p.title + '" with ' + (p.client || 'the client') + ' is in pipeline (' + v + '). Follow up this week.')
    else if (p.dealStatus === 'pipeline' && p.scenarioTier === 3)
      ideas.push('"' + p.title + '" is a stretch (' + v + '). Qualify the opportunity before investing time.')
    else if (p.dealStatus === 'commissioned' && p.totalValue && (p.received || 0) < p.totalValue)
      ideas.push('"' + p.title + '": ' + compact(p.totalValue - (p.received || 0), store.currency) + ' outstanding. Schedule the next invoice.')
  })
  if (!ideas.length) ideas.push('Board is steady. No open reads.')

  function dropOn(col: ProjectStatus) {
    if (!dragId) return
    api.update((s) => {
      const p = s.projects.find((x) => x.id === dragId)
      if (p) p.status = col
      return s
    })
    setDragId(null)
  }

  function createProject() {
    if (!newTitle.trim()) return
    api.update((s) => {
      s.projects.push({
        id: uid(),
        title: newTitle.trim(),
        status: 'backlog',
        owner: 'Founder',
        checklist: [],
        notes: [],
        files: [],
      })
      return s
    })
    setNewOpen(false)
    setNewTitle('')
  }

  function toggleCheck(projectId: string, index: number, done: boolean) {
    api.update((s) => {
      const p = s.projects.find((x) => x.id === projectId)
      if (p) p.checklist[index].done = done
      return s
    })
  }

  function addTask(projectId: string, text: string) {
    if (!text.trim()) return
    api.update((s) => {
      const p = s.projects.find((x) => x.id === projectId)
      if (p) p.checklist.push({ k: text.trim(), done: false })
      return s
    })
    setNewTask('')
  }

  function addNote(projectId: string, text: string) {
    if (!text.trim()) return
    api.update((s) => {
      const p = s.projects.find((x) => x.id === projectId)
      if (p) p.notes.unshift({ t: text.trim(), at: new Date().toISOString().slice(0, 10) })
      return s
    })
    setNewNote('')
  }

  function addFile(projectId: string) {
    const name = window.prompt('File name to attach:')
    if (!name) return
    api.update((s) => {
      const p = s.projects.find((x) => x.id === projectId)
      if (p) p.files.push(name)
      return s
    })
  }

  return (
    <div>
      <Station disc="C" kicker="MODULE 03 · PROJECTS" title="Projects" meta={'Kanban · ' + store.projects.length + ' · ' + compact(bookValue, store.currency) + ' book'} />

      <div className="mb-6 border border-line bg-paper p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border border-ink font-display text-[14px] font-bold">A</span>
          <p className="font-mono text-[11px] uppercase text-ink-3">Operator reads</p>
        </div>
        {ideas.slice(0, 4).map((t, i) => (
          <p key={i} className="mt-2 text-[14px] text-ink-2">{t}</p>
        ))}
      </div>

      <div className="mb-4 grid gap-px border border-line bg-line lg:grid-cols-4">
        {COLS.map((col) => {
          const cards = store.projects.filter((p) => p.status === col.id)
          return (
            <div key={col.id} className="flex min-h-[200px] flex-col bg-panel">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="font-mono text-[11px] uppercase text-ink-3">{col.label}</span>
                <span className="font-mono text-[11px] text-ink-3">{cards.length}</span>
              </div>
              <div
                className="flex flex-1 flex-col gap-2 p-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); dropOn(col.id) }}
              >
                {cards.length ? cards.map((p) => {
                  const done = (p.checklist || []).filter((c) => c.done).length
                  const tot = (p.checklist || []).length
                  const deal = p.dealStatus === 'commissioned'
                  const collectPct = deal && p.totalValue ? Math.min(100, ((p.received || 0) / p.totalValue) * 100) : 0
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setDetailId(p.id)}
                      className="cursor-pointer border border-line bg-paper p-3 hover:border-line-2"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-[14px] font-semibold">{p.title}</p>
                        {p.totalValue ? <span className="font-mono text-[14px]">{compact(p.totalValue, store.currency)}</span> : null}
                      </div>
                      {p.client ? <p className="mt-1 font-mono text-[11px] text-ink-3">{p.client}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.dealStatus ? (
                          <TagChip tone={deal ? 'amber' : 'human'}>
                            {deal ? 'Commissioned' : 'Pipeline · T' + (p.scenarioTier || '?')}
                          </TagChip>
                        ) : null}
                        <span className="font-mono text-[11px] text-ink-3">{tot ? done + '/' + tot + ' tasks' : 'No tasks'}</span>
                        {p.files?.length ? <span className="font-mono text-[11px] text-ink-3">{p.files.length} files</span> : null}
                      </div>
                      {deal && p.totalValue ? (
                        <div className="mt-2">
                          <ProgressBar pct={collectPct} variant="amber" />
                          <p className="mt-1 font-mono text-[11px] text-ink-3">
                            {money(p.received || 0, store.currency)} of {money(p.totalValue, store.currency)} collected
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )
                }) : <Empty>—</Empty>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="ghost" onClick={() => setNewOpen(true)}>+ New project</Btn>
        <span className="text-[14px] text-ink-3">Drag cards between columns.</span>
      </div>

      <Modal title="New project" open={newOpen} onClose={() => setNewOpen(false)} actions={<><Btn variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Btn><Btn onClick={createProject}>Create</Btn></>}>
        <label className="block"><span className="font-mono text-[11px] uppercase text-ink-3">Title</span><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-2" /></label>
      </Modal>

      {detail ? (
        <Modal
          title={detail.title}
          open={Boolean(detail)}
          onClose={() => setDetailId(null)}
          actions={
            <>
              <Btn variant="ghost" onClick={() => { api.update((s) => { const p = s.projects.find((x) => x.id === detail.id); if (p) p.status = 'backlog'; return s }); setDetailId(null) }}>Move to Backlog</Btn>
              <Btn onClick={() => setDetailId(null)}>Close</Btn>
            </>
          }
        >
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] uppercase text-ink-3">Checklist</p>
              <ul className="mt-2 space-y-2">
                {(detail.checklist || []).map((c, i) => (
                  <li key={i} className="flex min-h-[44px] items-center gap-3">
                    <input type="checkbox" checked={c.done} onChange={(e) => toggleCheck(detail.id, i, e.target.checked)} className="h-[18px] w-[18px] accent-amber" />
                    <span className={c.done ? 'text-ink-3 line-through' : ''}>{c.k}</span>
                  </li>
                ))}
              </ul>
              <Input placeholder="Add a task" value={newTask} onKeyDown={(e) => { if (e.key === 'Enter') addTask(detail.id, newTask) }} onChange={(e) => setNewTask(e.target.value)} className="mt-2" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] uppercase text-ink-3">Files</p>
                {(detail.files || []).length ? detail.files.map((f) => (
                  <div key={f} className="mt-2 flex justify-between text-[14px]"><span>{f}</span><span className="font-mono text-[11px] text-ink-3">uploaded</span></div>
                )) : <Empty>No files.</Empty>}
                <Btn variant="ghost" className="mt-2" onClick={() => addFile(detail.id)}>+ Upload file</Btn>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase text-ink-3">Notes</p>
                {(detail.notes || []).map((n, i) => (
                  <div key={i} className="mt-2 border border-line bg-paper p-3">
                    <p className="font-mono text-[11px] text-ink-3">{n.at}</p>
                    <p className="mt-1 text-[14px]">{n.t}</p>
                  </div>
                ))}
                {!detail.notes?.length ? <Empty>No notes yet.</Empty> : null}
                <Input placeholder="Log a note" value={newNote} onKeyDown={(e) => { if (e.key === 'Enter') addNote(detail.id, newNote) }} onChange={(e) => setNewNote(e.target.value)} className="mt-2" />
              </div>
            </div>
            <div className="border border-line bg-paper p-3">
              <p className="font-mono text-[11px] uppercase text-ink-3">AI read</p>
              <p className="mt-2 text-[14px] text-ink-2">{ideaFor(detail)}</p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { formatDateTime, orderedStatuses, statusTone } from '../format.ts'
import { usePolling } from '../polling.ts'
import { loadSnapshot, type RequestState } from '../request-state.ts'
import { t } from '../i18n.ts'
import type { Task, TaskBoardSnapshot, TaskDetailSnapshot } from '../types.ts'
import { Dialog, EmptyState, PageTitle, SearchInput, SourceStatus, Unavailable } from '../ui.tsx'
import { ProfileUnlock, RelockBar } from '../ProfileLock.tsx'
import { agentPrivacy, useProfileLock } from '../profile-lock.ts'

const UNASSIGNED = '(unassigned)'

function Field({ label, value }: { label: string; value?: string | number }) {
  return value === undefined || value === '' ? null : <div><dt>{label}</dt><dd>{value}</dd></div>
}

export function TaskDetailDialog({ task, onClose, onOpenTask }: { task: Task; onClose: () => void; onOpenTask?: (id: string) => void }) {
  const [state, setState] = useState<RequestState<TaskDetailSnapshot>>({ status: 'pending' })
  const lock = useProfileLock()
  // A locked agent's task stays private until its PIN is entered; the server refuses it too.
  const privacy = agentPrivacy(lock, task.assignee)
  const locked = privacy === 'locked' || (task.private === true && !lock)
  useEffect(() => {
    if (!task.id || locked) return
    let active = true
    setState({ status: 'pending' })
    void loadSnapshot<TaskDetailSnapshot>(`/api/tasks/${encodeURIComponent(task.id)}${task.board ? `?board=${encodeURIComponent(task.board)}` : ''}`).then((next) => { if (active) setState(next) })
    return () => { active = false }
  }, [task.id, task.board, locked])
  const detail = state.status === 'ready' && state.data.task.availability === 'available' ? state.data.task.data : null
  const failed = !task.id || state.status === 'failed' || (state.status === 'ready' && !detail)
  const status = detail?.status ?? task.status
  const links = (label: string, ids: string[]) => ids.length > 0 && <div><dt>{label}</dt><dd className="task-links">{ids.map((id) => <button type="button" key={id} className="chip chip-button" onClick={() => onOpenTask?.(id)}>{id}</button>)}</dd></div>
  return <Dialog labelledBy="task-detail-title" onClose={onClose} closeLabel={`${t('Close details for')} ${task.title}`} className="task-detail">
    <p className="eyebrow">KANBAN TASK{task.board ? ` · ${task.board.toUpperCase()} ${t('BOARD')}` : ''}{task.id ? ` · ${task.id}` : ''}</p>
    <h2 id="task-detail-title">{detail?.title ?? task.title}</h2>
    <div className="task-meta"><span className={`badge ${statusTone(status)}`}>{status}</span><span className={`chip ${task.assignee ? '' : 'chip-muted'}`}>{detail?.assignee ?? task.assignee ?? t('unassigned')}</span>{(detail?.priority ?? task.priority) ? <span className="chip chip-priority">P{detail?.priority ?? task.priority}</span> : null}</div>
    {locked && task.assignee ? <ProfileUnlock agent={task.assignee} minutes={lock?.unlockMinutes} compact/> : <>
    {privacy === 'unlocked' && task.assignee && <RelockBar agent={task.assignee} minutes={lock?.unlockMinutes ?? 15}/>}
    {state.status === 'pending' && task.id && <p className="muted">{t('Loading task details…')}</p>}
    {failed && <p className="file-notice">{task.id ? t('Full details are not available right now (hermes kanban show could not be read). Showing the board summary.') : t('This task has no id, so only the board summary is available.')}</p>}
    {detail && <>
      <dl className="office-detail-grid task-grid">
        <Field label={t('Created')} value={detail.createdAt ? `${formatDateTime(detail.createdAt)}${detail.createdBy ? ` ${t('by')} ${detail.createdBy}` : ''}` : undefined}/>
        <Field label={t('Started')} value={detail.startedAt && formatDateTime(detail.startedAt)}/>
        <Field label={t('Completed')} value={detail.completedAt && formatDateTime(detail.completedAt)}/>
        <Field label={t('Workspace')} value={detail.workspace}/>
        <Field label={t('Branch')} value={detail.branch}/>
        <Field label={t('Model')} value={detail.model}/>
        <Field label={t('Tenant')} value={detail.tenant}/>
        <Field label={t('Skills')} value={detail.skills.join(', ')}/>
        {links(t('Depends on'), detail.parents)}
        {links(t('Blocks'), detail.children)}
      </dl>
      {detail.lastError && <section className="task-section"><p className="eyebrow">{t('LAST FAILURE')}</p><pre className="task-text text-bad">{detail.lastError}</pre></section>}
      <section className="task-section"><p className="eyebrow">{t('DESCRIPTION')}</p>{detail.body ? <pre className="task-text">{detail.body}</pre> : <p className="muted">{t('No description.')}</p>}</section>
      {detail.result && <section className="task-section"><p className="eyebrow">{t('RESULT / LATEST SUMMARY')}</p><pre className="task-text">{detail.result}</pre></section>}
      {detail.runs.length > 0 && <section className="task-section"><p className="eyebrow">{t('RUNS')} ({detail.runs.length})</p><table className="log-table"><thead><tr><th>{t('Run')}</th><th>{t('Profile')}</th><th>{t('Status')}</th><th>{t('Started')}</th><th>{t('Ended')}</th></tr></thead><tbody>{detail.runs.map((run) => <tr key={run.id}><td>#{run.id}</td><td>{run.profile ?? '—'}</td><td><span className={`badge ${statusTone(run.outcome ?? run.status ?? '')}`}>{run.outcome ?? run.status ?? '—'}</span>{run.error && <div className="text-bad small-note">{run.error}</div>}{run.summary && <div className="small-note">{run.summary}</div>}</td><td>{formatDateTime(run.startedAt)}</td><td>{formatDateTime(run.endedAt)}</td></tr>)}</tbody></table></section>}
      {detail.comments.length > 0 && <section className="task-section"><p className="eyebrow">{t('COMMENTS')} ({detail.comments.length})</p><ul className="task-timeline">{detail.comments.map((comment, index) => <li key={index}><b>{comment.author}</b><small>{formatDateTime(comment.createdAt)}</small><p>{comment.body}</p></li>)}</ul></section>}
      {detail.events.length > 0 && <section className="task-section"><p className="eyebrow">{t('ACTIVITY')} ({detail.events.length})</p><ul className="task-timeline">{[...detail.events].reverse().map((event, index) => <li key={index}><b>{event.kind}</b><small>{formatDateTime(event.createdAt)}{event.runId ? ` · ${t('run')} #${event.runId}` : ''}</small>{event.detail && <code>{event.detail}</code>}</li>)}</ul></section>}
    </>}
    </>}
  </Dialog>
}

export function TaskBoard() {
  const snapshot = usePolling<TaskBoardSnapshot>('/api/tasks', 10_000)
  const [query, setQuery] = useState('')
  const [assignee, setAssignee] = useState('all')
  const [board, setBoard] = useState('all')
  const [openTask, setOpenTask] = useState<Task | undefined>()
  const trigger = useRef<HTMLButtonElement | null>(null)
  const boardRef = useRef<HTMLElement | null>(null)
  /** Scrolls the board sideways by about one column, or to a column. */
  const scrollBoard = (direction: number) => boardRef.current?.scrollBy({ left: direction * 250, behavior: 'smooth' })
  const showColumn = (status: string) => boardRef.current?.querySelector<HTMLElement>(`[data-status="${CSS.escape(status)}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  const closeTask = () => { setOpenTask(undefined); trigger.current?.focus() }
  const data = snapshot.status === 'ready' ? snapshot.data : undefined
  const tasks = data?.tasks
  const all = tasks?.data ?? []
  const assignees = [...new Set(all.map((task) => task.assignee ?? UNASSIGNED))].sort()
  const boards = data?.boards ?? []
  const multiBoard = boards.length > 1
  const needle = query.trim().toLowerCase()
  const visible = all.filter((task) => (assignee === 'all' || (task.assignee ?? UNASSIGNED) === assignee) && (board === 'all' || task.board === board) && (!needle || `${task.title} ${task.id ?? ''} ${task.assignee ?? ''}`.toLowerCase().includes(needle)))
  const columns = orderedStatuses(all.map((task) => task.status), true)
  return <><PageTitle eyebrow="HERMES KANBAN" title={t('Task board')}>{t('Live, read-only view of')} <code>hermes kanban list</code> {t('across every Kanban board. Columns follow the Hermes board order; the board refreshes every 10 seconds.')}</PageTitle>
    <SourceStatus source={tasks} fetchedAt={data?.fetchedAt} request={snapshot}/><Unavailable source={tasks} request={snapshot}/>
    {data?.failedBoards && <p className="file-notice">{t('Could not read these boards:')} {data.failedBoards.join(', ')} — {t('showing the others.')}</p>}
    {tasks?.availability === 'available' && (all.length === 0 ? <EmptyState title={t('No tasks')}>{multiBoard ? <>{t('None of the')} {boards.length} {t('Kanban boards has open tasks.')}</> : t('Hermes returned an empty Kanban task list.')} {t('Create one with')} <code>hermes kanban create</code>.</EmptyState> : <>
      <div className="toolbar"><SearchInput value={query} onChange={setQuery} label={t('Search tasks')}/><label className="select-label">{t('Assignee')} <select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">{t('All')} ({all.length})</option>{assignees.map((name) => <option key={name} value={name}>{name === UNASSIGNED ? t('(unassigned)') : name}</option>)}</select></label>{multiBoard && <label className="select-label">{t('Board')} <select value={board} onChange={(event) => setBoard(event.target.value)}><option value="all">{t('All boards')}</option>{boards.map((item) => <option key={item.slug} value={item.slug}>{item.name}{item.current ? ` (${t('current')})` : ''}</option>)}</select></label>}<span className="toolbar-count">{visible.length} {t('shown')}</span></div>
      <nav className="board-nav" aria-label={t('Kanban columns')}>
        <button type="button" className="refresh-button" onClick={() => scrollBoard(-1)} aria-label={t('Scroll the board left')}>‹</button>
        <div className="board-nav-chips">{columns.map((status) => <button type="button" key={status} className={`chip chip-button tone-border-${statusTone(status)}`} onClick={() => showColumn(status)}>{status} <b>{visible.filter((task) => task.status === status).length}</b></button>)}</div>
        <button type="button" className="refresh-button" onClick={() => scrollBoard(1)} aria-label={t('Scroll the board right')}>›</button>
      </nav>
      <section className="board" aria-label={t('Kanban board')} ref={boardRef}>{columns.map((status) => {
        const items = visible.filter((task) => task.status === status).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
        return <article key={status} data-status={status} className={`column tone-border-${statusTone(status)}`} aria-label={`${t('Column')} ${status}`}><header className="column-head"><p className="eyebrow">{status}</p><span className="column-count">{items.length}</span></header>
          {items.length === 0 ? <p className="column-empty">—</p> : items.map((task) => <button type="button" className="task task-card" key={`${task.board ?? ''}-${task.status}-${task.id ?? task.title}`} onClick={(event) => { trigger.current = event.currentTarget; setOpenTask(task) }} aria-label={`${task.title}. ${task.status}. ${t('Open task details.')}`}><strong>{task.title}</strong><div className="task-meta">{task.id && <small>{task.id}</small>}{multiBoard && task.board && <span className="chip chip-muted">{task.board}</span>}<span className={`chip ${task.assignee ? '' : 'chip-muted'}`}>{task.assignee ?? t('unassigned')}</span>{task.priority ? <span className="chip chip-priority">P{task.priority}</span> : null}</div></button>)}
        </article>
      })}</section>
    </>)}
    {openTask && <TaskDetailDialog key={`${openTask.board ?? ''}-${openTask.id ?? openTask.title}`} task={openTask} onClose={closeTask} onOpenTask={(id) => setOpenTask(all.find((task) => task.id === id && task.board === openTask.board) ?? { id, title: id, status: 'unknown', ...(openTask.board ? { board: openTask.board } : {}) })}/>}
  </>
}

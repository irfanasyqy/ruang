import { useState } from 'react'
import { usePolling } from '../polling.ts'
import type { ActivitySnapshot } from '../types.ts'
import { t } from '../i18n.ts'
import { EmptyState, PageTitle, SearchInput, SourceStatus, Unavailable } from '../ui.tsx'

export function Activity() {
  const snapshot = usePolling<ActivitySnapshot>('/api/activity', 15_000)
  const [query, setQuery] = useState('')
  const data = snapshot.status === 'ready' ? snapshot.data : undefined
  const sessions = data?.sessions
  const needle = query.trim().toLowerCase()
  const visible = (sessions?.data ?? []).filter((session) => !needle || `${session.title} ${session.preview} ${session.workspace ?? ''} ${session.source ?? ''}`.toLowerCase().includes(needle))
  return <><PageTitle eyebrow="HERMES SESSIONS" title={t('Activity')}>{t('The 20 most recent Hermes sessions. Events and work history are not invented from session data.')}</PageTitle>
    <SourceStatus source={sessions} fetchedAt={data?.fetchedAt} request={snapshot}/><Unavailable source={sessions} request={snapshot}/>
    {sessions?.availability === 'available' && (sessions.data.length === 0 ? <EmptyState title={t('No recent sessions')}>{t('Hermes has no sessions yet. Start one with')} <code>hermes</code>.</EmptyState> : <>
      <div className="toolbar"><SearchInput value={query} onChange={setQuery} label={t('Search sessions')}/><span className="toolbar-count">{visible.length} {t('of')} {sessions.data.length}</span></div>
      <section className="data-list">{visible.map((session) => <article key={session.id ?? `${session.title}-${session.lastActive}`}><div><h2>{session.title}</h2>{session.preview && session.preview !== session.title && <p>{session.preview}</p>}</div><dl><div><dt>{t('Last active')}</dt><dd>{session.lastActive}</dd></div>{session.workspace && <div><dt>{t('Workspace')}</dt><dd>{session.workspace}</dd></div>}{session.source && <div><dt>{t('Source')}</dt><dd>{session.source}</dd></div>}{session.id && <div><dt>{t('Session ID')}</dt><dd>{session.id}</dd></div>}</dl></article>)}</section>
    </>)}
  </>
}

import { useEffect, useState } from 'react'
import { LOCKED_EVENT } from '../access.ts'
import { formatBytes, formatDateTime } from '../format.ts'
import { t } from '../i18n.ts'
import { usePolling } from '../polling.ts'
import type { RequestState } from '../request-state.ts'
import type { FolderAgent, FolderAgentsSnapshot, FolderFile, FolderListing } from '../types.ts'
import { EmptyState, LoadingState, PageTitle, SearchInput, SourceStatus, Unavailable } from '../ui.tsx'
import { PixelCharacter } from './Office.tsx'
import { PrivateGate } from '../ProfileLock.tsx'
import { agentPrivacy, useProfileLock } from '../profile-lock.ts'

function folderUrl(agent: string, kind: 'list' | 'file', path: string): string {
  return `/api/folders/${encodeURIComponent(agent)}/${kind}?path=${encodeURIComponent(path)}`
}

type FolderRequest<T> = RequestState<T> & { error?: string; reload: () => void }

/** Like loadSnapshot, but keeps the server's explanation (permission denied, not found…). */
async function loadWithReason<T>(url: string): Promise<RequestState<T> & { error?: string }> {
  try {
    const response = await fetch(url)
    const body = await response.json().catch(() => undefined) as (T & { error?: unknown; locked?: unknown }) | undefined
    if (response.ok && body) return { status: 'ready', data: body }
    if (response.status === 401 && body?.locked === true) window.dispatchEvent(new Event(LOCKED_EVENT))
    return { status: 'failed', error: typeof body?.error === 'string' ? body.error : `${t('Request failed')} (HTTP ${response.status}).` }
  } catch {
    return { status: 'failed', error: t('The ASYQY AI OFFICE API could not be reached.') }
  }
}

function useRequest<T>(url: string | undefined): FolderRequest<T> {
  const [state, setState] = useState<RequestState<T> & { error?: string }>({ status: 'pending' })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!url) return
    let active = true
    setState({ status: 'pending' })
    void loadWithReason<T>(url).then((next) => { if (active) setState(next) })
    return () => { active = false }
  }, [url, nonce])
  return { ...state, reload: () => setNonce((value) => value + 1) } as FolderRequest<T>
}

function FileViewer({ agent, path }: { agent: string; path: string }) {
  const file = useRequest<FolderFile>(folderUrl(agent, 'file', path))
  if (file.status === 'pending') return <LoadingState message={`${t('Opening')} ${path}...`}/>
  if (file.status === 'failed') return <EmptyState title={t('Cannot open file')}>{file.error ?? t('The file could not be read.')}</EmptyState>
  const data = file.data
  return <section className="file-viewer" aria-label={`${t('Contents of')} ${data.path}`}>
    <header className="file-head"><div><p className="eyebrow">{t('FILE')}</p><h2>{data.path.split('/').pop()}</h2></div><dl><div><dt>{t('Size')}</dt><dd>{formatBytes(data.size)}</dd></div><div><dt>{t('Modified')}</dt><dd>{formatDateTime(data.modified)}</dd></div></dl></header>
    {data.kind === 'sensitive' ? <div className="file-notice locked">🔒 {t('This file can hold credentials (keys, tokens, auth or database state). ASYQY AI OFFICE lists it but never reads its contents.')}</div>
      : data.kind === 'binary' ? <div className="file-notice">{t('Binary file. No text preview.')}</div>
        : <>
          {data.truncated && <div className="file-notice">{t('Showing the first 256 KB of this file.')}</div>}
          {!!data.redactions && <div className="file-notice">{data.redactions} {data.redactions === 1 ? t('line') : t('lines')} {t('had secrets masked as [redacted].')}</div>}
          <pre className="file-content" tabIndex={0}>{data.content || <span className="muted">{t('(empty file)')}</span>}</pre>
        </>}
  </section>
}

function Browser({ agent, onBack }: { agent: FolderAgent; onBack?: () => void }) {
  const [directory, setDirectory] = useState('')
  const [selected, setSelected] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const listing = useRequest<FolderListing>(folderUrl(agent.profile, 'list', directory))
  const parts = directory ? directory.split('/') : []
  const open = (next: string) => { setDirectory(next); setSelected(undefined); setQuery('') }
  const needle = query.trim().toLowerCase()
  const entries = listing.status === 'ready' ? listing.data.entries.filter((entry) => !needle || entry.name.toLowerCase().includes(needle)) : []
  return <>
    <nav className="breadcrumb" aria-label={t('Folder path')}>
      {onBack && <><button type="button" onClick={onBack}>{t('All agents')}</button><span>/</span></>}
      <button type="button" onClick={() => open('')} aria-current={!directory ? 'page' : undefined} title={agent.path}>{agent.label} <small>{agent.path}</small></button>
      {parts.map((part, index) => <span key={index} className="crumb"><span>/</span><button type="button" onClick={() => open(parts.slice(0, index + 1).join('/'))} aria-current={index === parts.length - 1 ? 'page' : undefined}>{part}</button></span>)}
      <button type="button" className="refresh-button crumb-refresh" onClick={listing.reload}>{t('↻ REFRESH')}</button>
    </nav>
    <section className="folder-browser">
      <div className="file-list-pane">
        <SearchInput value={query} onChange={setQuery} label={t('Filter this folder')}/>
        {listing.status === 'pending' ? <p className="muted">{t('Loading folder...')}</p> : listing.status === 'failed' ? <div className="file-notice locked" role="alert"><strong>{t('This folder could not be read.')}</strong><br/>{listing.error}</div> : <>
          <ul className="file-list" aria-label={t('Folder contents')}>
            {directory && <li><button type="button" className="file-row" onClick={() => open(parts.slice(0, -1).join('/'))}><span className="file-icon">↰</span><span className="file-name">..</span></button></li>}
            {entries.map((entry) => <li key={entry.path}><button type="button" className={`file-row${selected === entry.path ? ' active' : ''}`} aria-current={selected === entry.path ? 'true' : undefined} onClick={() => entry.type === 'dir' ? open(entry.path) : setSelected(entry.path)}>
              <span className="file-icon" aria-hidden="true">{entry.unreadable ? '⛔' : entry.type === 'dir' ? '📁' : entry.sensitive ? '🔒' : '📄'}</span>
              <span className="file-name">{entry.name}</span>
              <span className="file-size">{entry.unreadable ? t('no access') : entry.type === 'dir' ? '' : formatBytes(entry.size)}</span>
            </button></li>)}
          </ul>
          {entries.length === 0 && <p className="muted">{needle ? t('No matching files.') : t('This folder is empty.')}</p>}
          {listing.data.truncated && <p className="muted">{t('Showing the first 500 entries.')}</p>}
          {listing.data.hiddenCount > 0 && <p className="muted small-note">{listing.data.hiddenCount} {t(listing.data.hiddenCount === 1 ? 'system folder hidden' : 'system folders hidden')} {t('(other profiles, install, caches).')}</p>}
        </>}
      </div>
      <div className="file-view-pane">{selected ? <FileViewer agent={agent.profile} path={selected}/> : <EmptyState title={t('Select a file')}>{t('Pick a file on the left to view it. Folders open in place.')}</EmptyState>}</div>
    </section>
  </>
}

/** One agent's folder browser, for the Office agent dialog. */
export function AgentFolder({ profile }: { profile: string }) {
  const snapshot = usePolling<FolderAgentsSnapshot>('/api/folders', 60_000)
  const agent = snapshot.status === 'ready' ? snapshot.data.agents.find((item) => item.profile === profile) : undefined
  if (snapshot.status === 'pending') return <LoadingState message={t('Finding the agent folder...')}/>
  if (snapshot.status === 'failed') return <EmptyState title={t('Not Available')}>{snapshot.message ?? t('The folder list could not be read.')}</EmptyState>
  if (!agent || !agent.available) return <EmptyState title={t('Folder not available')}>{agent?.reason ?? t('This agent has no readable folder.')}</EmptyState>
  return <div className="embedded-folder"><PrivateGate agent={agent.profile} compact>{agent.warning && <p className="file-notice">⚠ {agent.warning}</p>}<Browser key={agent.profile} agent={agent}/></PrivateGate></div>
}

export function Folders() {
  const snapshot = usePolling<FolderAgentsSnapshot>('/api/folders', 60_000)
  const [openAgent, setOpenAgent] = useState<string | undefined>()
  const lock = useProfileLock()
  const data = snapshot.status === 'ready' ? snapshot.data : undefined
  const agent = data?.agents.find((item) => item.profile === openAgent)
  const source = data ? { availability: 'available' as const, data: null } : undefined
  return <><PageTitle eyebrow={t('AGENT FOLDERS')} title={t('Folders')}>{t("Each agent's own folder, read-only: its Hermes profile folder (SOUL.md, memories, skills, cron, config…) or, for OpenCode, its home folder. Every agent only shows its own files. Credential files are listed but never opened.")}</PageTitle>
    {!agent && <SourceStatus source={source} fetchedAt={data?.fetchedAt} request={snapshot}/>}
    <Unavailable source={source} request={snapshot}/>
    {snapshot.status === 'pending' ? <LoadingState message={t('Finding agent folders...')}/> : agent ? <><PrivateGate agent={agent.profile}><Browser key={agent.profile} agent={agent} onBack={() => setOpenAgent(undefined)}/></PrivateGate>{agentPrivacy(lock, agent.profile) === 'locked' && <button type="button" className="refresh-button" onClick={() => setOpenAgent(undefined)}>{t('← ALL AGENTS')}</button>}</> : data && <section className="folder-agents">{data.agents.map((item) => <button type="button" key={item.profile} className="folder-agent" disabled={!item.available} onClick={() => setOpenAgent(item.profile)}>
      <span className="folder-glyph" aria-hidden="true"><PixelCharacter agent={item.profile}/></span>
      <span className="folder-meta"><strong>{agentPrivacy(lock, item.profile) === 'locked' && '🔒 '}{item.label}</strong><code className="folder-path">{item.path}</code><small>{item.available ? t('Open folder →') : item.reason ?? t('Folder not available')}</small>{item.warning && <small className="text-bad">⚠ {item.warning}</small>}</span>
    </button>)}</section>}
  </>
}

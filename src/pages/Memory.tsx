import { useState } from 'react'
import { formatDateTime, formatNumber } from '../format.ts'
import { t } from '../i18n.ts'
import { usePolling } from '../polling.ts'
import type { AgentMemory, MemoryDocument, MemorySnapshot, MemoryStore } from '../types.ts'
import { EmptyState, LoadingState, PageTitle, SearchInput, SourceStatus, Unavailable } from '../ui.tsx'
import { PixelCharacter } from './Office.tsx'
import { PrivateGate, ProfileUnlock } from '../ProfileLock.tsx'

function DocumentBody({ document, empty }: { document?: MemoryDocument; empty: string }) {
  if (!document || !document.exists) return <p className="muted">{empty}</p>
  if (document.error) return <p className="file-notice locked">{document.error}</p>
  return <>
    <p className="doc-meta">{formatNumber(document.chars ?? 0)} {t('chars')} · {t('updated')} {formatDateTime(document.modified)}{document.redactions ? ` · ${document.redactions} ${t('line(s) redacted')}` : ''}{document.truncated ? ` · ${t('showing first 256 KB')}` : ''}</p>
    <pre className="task-text doc-text">{document.content || <span className="muted">{t('(empty file)')}</span>}</pre>
  </>
}

function StoreCard({ title, subtitle, store, enabled, needle }: { title: string; subtitle: string; store?: MemoryStore; enabled: boolean; needle: string }) {
  const percent = store?.percent ?? 0
  const tone = percent >= 100 ? 'bad' : percent >= 80 ? 'unknown' : 'good'
  const entries = (store?.entries ?? []).map((entry, index) => ({ entry, index })).filter(({ entry }) => !needle || entry.toLowerCase().includes(needle))
  return <article className="card memory-card">
    <header className="memory-card-head"><div><p className="eyebrow">{title}</p><h2>{subtitle}</h2></div>{!enabled && <span className="badge muted">{t('disabled in config')}</span>}</header>
    {!store || !store.exists ? <p className="muted">{t('No entries yet.')} <code>{store?.path ?? 'memories/'}</code> {t('is created when the agent first saves with the memory tool.')}</p>
      : store.error ? <p className="file-notice locked">{store.error}</p>
        : <>
          <div className="usage" role="img" aria-label={`${title} ${t('usage')} ${percent}%`}><i className={`tone-${tone}`} style={{ width: `${Math.min(100, percent)}%` }}/></div>
          <p className="doc-meta"><b>{percent}%</b> — {formatNumber(store.used)} / {formatNumber(store.limit)} {t('chars')} · {store.entries.length} {t(store.entries.length === 1 ? 'entry' : 'entries')} · {t('updated')} {formatDateTime(store.modified)}</p>
          {percent >= 80 && <p className="file-notice">{t('Above 80% of the limit. Hermes rejects writes that would exceed it, so the agent will need to consolidate entries soon.')}</p>}
          {entries.length === 0 ? <p className="muted">{needle ? t('No matching entries.') : t('The file is empty.')}</p> : <ol className="memory-entries">{entries.map(({ entry, index }) => <li key={index}><span className="entry-index">§{index + 1}</span><p>{entry}</p><small>{formatNumber(entry.length)} {t('chars')}</small></li>)}</ol>}
        </>}
  </article>
}

function AgentPanel({ agent, onOpenFolders }: { agent: AgentMemory; onOpenFolders?: () => void }) {
  const [query, setQuery] = useState('')
  const [openContext, setOpenContext] = useState<string | undefined>()
  const needle = query.trim().toLowerCase()
  if (!agent.available) return <EmptyState title={t('Not available')}>{agent.reason ?? t('This agent folder is not available.')}</EmptyState>
  const settings = agent.settings
  return <div className="memory-panel">
    <div className="toolbar">
      {agent.kind === 'hermes' && <SearchInput value={query} onChange={setQuery} label={t('Search memory entries')}/>}
      <code className="folder-path">{agent.path}</code>
      {onOpenFolders && <button type="button" className="refresh-button" onClick={onOpenFolders}>{t('OPEN IN FOLDERS →')}</button>}
    </div>
    {settings && <div className="chip-row" aria-label={t('Memory settings')}>
      <span className={`chip ${settings.memoryEnabled ? '' : 'chip-muted'}`}>{t('memory')} {settings.memoryEnabled ? t('on') : t('off')}</span>
      <span className={`chip ${settings.userProfileEnabled ? '' : 'chip-muted'}`}>{t('user profile')} {settings.userProfileEnabled ? t('on') : t('off')}</span>
      <span className={`chip ${settings.writeApproval ? 'chip-priority' : 'chip-muted'}`}>{t('write approval')} {settings.writeApproval ? t('required') : t('off')}</span>
      {settings.provider && <span className="chip chip-priority">{t('external provider:')} {settings.provider}</span>}
      <span className="chip chip-muted">{t('limits from')} {settings.source}</span>
    </div>}
    {agent.kind === 'hermes' ? <>
      <section className="memory-grid">
        <StoreCard title="MEMORY.MD" subtitle={t('Agent notes')} store={agent.memory} enabled={settings?.memoryEnabled ?? true} needle={needle}/>
        <StoreCard title="USER.MD" subtitle={t('User profile')} store={agent.user} enabled={settings?.userProfileEnabled ?? true} needle={needle}/>
      </section>
      <article className="card memory-soul">
        <header className="memory-card-head"><div><p className="eyebrow">{t('SOUL.MD · IDENTITY (SYSTEM PROMPT SLOT #1)')}</p><h2>{t('Who this agent is')}</h2></div></header>
        <DocumentBody document={agent.soul} empty={t('No SOUL.md in this profile. Hermes seeds a default one; the agent uses the built-in identity until then.')}/>
      </article>
    </> : <p className="card-note">{t('OpenCode is not a Hermes profile, so it has no MEMORY.md / USER.md. Its global rules files are shown below.')}</p>}
    <article className="card memory-soul">
      <header className="memory-card-head"><div><p className="eyebrow">{t('CONTEXT FILES')}</p><h2>{agent.kind === 'hermes' ? 'AGENTS.md, HERMES.md, CLAUDE.md…' : t('Global rules')}</h2></div></header>
      {agent.contextFiles.length === 0 ? <p className="muted">{t('No context files in this folder. Project context files (AGENTS.md, .hermes.md) usually live in the project being worked on, not in the profile.')}</p>
        : <ul className="context-list">{agent.contextFiles.map((document) => <li key={document.path}>
          <button type="button" className="file-row" aria-expanded={openContext === document.path} onClick={() => setOpenContext(openContext === document.path ? undefined : document.path)}><span className="file-icon" aria-hidden="true">📄</span><span className="file-name">{document.name}</span><span className="file-size">{formatNumber(document.chars ?? 0)} {t('chars')}</span></button>
          {openContext === document.path && <DocumentBody document={document} empty=""/>}
        </li>)}</ul>}
    </article>
  </div>
}

/** One agent's memory (SOUL.md, MEMORY.md, USER.md, context files), for the Office agent dialog. */
export function AgentMemoryView({ profile }: { profile: string }) {
  const snapshot = usePolling<MemorySnapshot>('/api/memory', 30_000)
  const agent = snapshot.status === 'ready' ? snapshot.data.agents.find((item) => item.profile === profile) : undefined
  if (snapshot.status === 'pending') return <LoadingState message={t('Reading agent memory...')}/>
  if (snapshot.status === 'failed') return <EmptyState title={t('Not Available')}>{snapshot.message ?? t('Memory could not be read.')}</EmptyState>
  if (!agent) return <EmptyState title={t('Not available')}>{t('No memory was found for this agent.')}</EmptyState>
  return <PrivateGate agent={agent.profile} compact>{agent.locked ? <ProfileUnlock agent={agent.profile} compact/> : <AgentPanel key={agent.profile} agent={agent}/>}</PrivateGate>
}

export function Memory({ onOpenFolders }: { onOpenFolders?: () => void }) {
  const snapshot = usePolling<MemorySnapshot>('/api/memory', 30_000)
  const data = snapshot.status === 'ready' ? snapshot.data : undefined
  const [selected, setSelected] = useState<string | undefined>()
  const agents = data?.agents ?? []
  const agent = agents.find((item) => item.profile === selected) ?? agents.find((item) => item.available) ?? agents[0]
  const source = data ? { availability: 'available' as const, data: null } : undefined
  return <><PageTitle eyebrow={t('MEMORY & KNOWLEDGE')} title={t('Memory')}>{t('What each agent carries into every session: its identity (SOUL.md), its bounded memory (MEMORY.md and USER.md, injected as a frozen snapshot at session start) and its context files. Read-only; secrets are redacted.')}</PageTitle>
    <SourceStatus source={source} fetchedAt={data?.fetchedAt} request={snapshot}/>
    <Unavailable source={source} request={snapshot}/>
    {snapshot.status === 'pending' ? <LoadingState message={t('Reading agent memory...')}/> : agent && <>
      <div className="memory-tabs" role="tablist" aria-label={t('Agents')}>{agents.map((item) => {
        const peak = Math.max(item.memory?.percent ?? 0, item.user?.percent ?? 0)
        return <button key={item.profile} role="tab" aria-selected={item.profile === agent.profile} className={`memory-tab${item.profile === agent.profile ? ' active' : ''}`} onClick={() => setSelected(item.profile)} disabled={!item.available && !item.locked}>
          <span className="folder-glyph small" aria-hidden="true"><PixelCharacter agent={item.profile}/></span>
          <span><strong>{item.locked ? '🔒 ' : ''}{item.label}</strong><small>{!item.available ? item.reason ?? t('not available') : item.kind === 'opencode' ? `${item.contextFiles.length} ${t('rules file(s)')}` : `${(item.memory?.entries.length ?? 0) + (item.user?.entries.length ?? 0)} ${t('entries')} · ${peak}% ${t('peak')}`}</small></span>
        </button>
      })}</div>
      <PrivateGate agent={agent.profile}>{agent.locked ? <ProfileUnlock agent={agent.profile}/> : <AgentPanel key={agent.profile} agent={agent} onOpenFolders={onOpenFolders}/>}</PrivateGate>
    </>}
  </>
}

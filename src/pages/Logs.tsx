import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../format.ts'
import { t } from '../i18n.ts'
import { usePolling } from '../polling.ts'
import type { CommandLogSnapshot, LogLevel, LogsSnapshot } from '../types.ts'
import { EmptyState, LoadingState, PageTitle, SearchInput, SourceStatus } from '../ui.tsx'

const LEVELS: ('ALL' | LogLevel)[] = ['ALL', 'ERROR', 'WARNING', 'INFO', 'DEBUG']
const MISSION_CONTROL = 'mission-control'

export function Logs() {
  const [follow, setFollow] = useState(true)
  const logs = usePolling<LogsSnapshot>('/api/logs', follow ? 5_000 : 0)
  const commands = usePolling<CommandLogSnapshot>('/api/command-log', follow ? 5_000 : 0)
  const [tab, setTab] = useState('agent')
  const [level, setLevel] = useState<'ALL' | LogLevel>('ALL')
  const [query, setQuery] = useState('')
  const viewer = useRef<HTMLPreElement>(null)
  const data = logs.status === 'ready' ? logs.data : undefined
  const file = data?.files.find((item) => item.name === tab)
  const needle = query.trim().toLowerCase()
  const lines = (file?.source.data ?? []).filter((line) => (level === 'ALL' || line.level === level) && (!needle || line.text.toLowerCase().includes(needle)))
  const commandData = commands.status === 'ready' ? commands.data : undefined

  useEffect(() => {
    if (follow && viewer.current) viewer.current.scrollTop = viewer.current.scrollHeight
  }, [follow, lines.length, tab])

  const tabs = [...(data?.files.map((item) => ({ name: item.name, label: item.label, count: item.source.data.filter((line) => line.level === 'ERROR').length })) ?? []), { name: MISSION_CONTROL, label: t('Command audit'), count: commandData?.health.failed ?? 0 }]
  return <><PageTitle eyebrow={t('HERMES LOGS')} title={t('Logs')}>{t('Tail of')} <code>hermes logs</code> {t("(agent, gateway, errors) with secrets redacted, plus the server's own audit of every read command it ran.")}</PageTitle>
    {tab === MISSION_CONTROL ? <SourceStatus source={commandData ? { availability: 'available', data: null } : undefined} fetchedAt={commandData?.fetchedAt} request={commands}/> : <SourceStatus source={file?.source} fetchedAt={data?.fetchedAt} request={logs}/>}
    <div className="room-tabs log-tabs" role="tablist" aria-label={t('Log files')}>{tabs.map((item) => <button key={item.name} role="tab" aria-selected={tab === item.name} className={tab === item.name ? 'active' : ''} onClick={() => setTab(item.name)}>{item.label}{item.count > 0 && <span className="room-count error-count">{item.count}</span>}</button>)}</div>
    {tab === MISSION_CONTROL ? (commands.status === 'pending' ? <LoadingState message={t('Reading command audit...')}/> : !commandData ? <EmptyState title={t('Not Available')}>{t('The ASYQY AI OFFICE API could not be reached.')}</EmptyState> : <>
      <p className="card-note">{commandData.health.total} {t('reads recorded')} · {commandData.health.failed} {t('failed')} · {commandData.health.averageMs} ms {t('average.')} {t('Only fixed, read-only commands are ever executed.')}</p>
      {commandData.entries.length === 0 ? <EmptyState title={t('No reads yet')}>{t('Commands appear here as pages load data.')}</EmptyState> : <table className="log-table"><thead><tr><th>{t('Time')}</th><th>{t('Command')}</th><th>{t('Result')}</th><th>{t('Duration')}</th></tr></thead><tbody>{commandData.entries.map((entry, index) => <tr key={`${entry.at}-${index}`}><td>{formatTime(entry.at)}</td><td><code>{entry.command}</code></td><td>{entry.ok ? <span className="badge good">{t('ok')}</span> : <span className="badge bad" title={entry.error}>{entry.error ?? t('failed')}</span>}</td><td>{entry.durationMs} ms</td></tr>)}</tbody></table>}
    </>) : logs.status === 'pending' ? <LoadingState message={t('Reading Hermes logs...')}/> : !file ? <EmptyState title={t('Not Available')}>{t('The ASYQY AI OFFICE API could not be reached.')}</EmptyState> : file.source.availability === 'unavailable' ? <EmptyState title={t('Not Available')}>{file.source.error?.message ?? t('hermes logs could not be read.')}</EmptyState> : <>
      <div className="toolbar"><SearchInput value={query} onChange={setQuery} label={t('Filter log lines')}/><label className="select-label">{t('Level')} <select value={level} onChange={(event) => setLevel(event.target.value as 'ALL' | LogLevel)}>{LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)}/> {t('Follow (5s)')}</label><span className="toolbar-count">{lines.length} {t('of')} {file.source.data.length} {t('lines')}</span></div>
      {file.source.data.length === 0 ? <EmptyState title={t('Log is empty')}>{t('Hermes has not written to the')} {file.label.toLowerCase()} {t('log yet.')}</EmptyState> : <pre className="log-viewer" ref={viewer} tabIndex={0} aria-label={`${file.label} ${t('log')}`}>{lines.map((line, index) => <span key={index} className={`log-line level-${line.level.toLowerCase()}`}>{line.text}{'\n'}</span>)}</pre>}
    </>}
  </>
}

import { formatDateTime, formatNumber, orderedStatuses, statusTone } from '../format.ts'
import { t } from '../i18n.ts'
import type { DashboardSnapshot } from '../types.ts'
import { EmptyState, LoadingState } from '../ui.tsx'
import { TokenUsage } from './TokenUsage.tsx'
import type { Page } from '../routes.ts'

function availableCount(source: { availability: string; total: number }, unit?: string) {
  return source.availability === 'available' ? `${formatNumber(source.total)}${unit ? ` ${unit}` : ''}` : t('Not Available')
}

function StatTile({ label, value, detail, onClick }: { label: string; value: string; detail?: string; onClick?: () => void }) {
  return <button type="button" className="stat-tile" onClick={onClick} disabled={!onClick}><span>{label}</span><strong className={value === t('Not Available') ? 'na' : undefined}>{value}</strong>{detail && <small>{detail}</small>}</button>
}

/** The operations overview (formerly the Dashboard page), shown in the Office panel's Stats tab. */
export function Stats({ dashboard, pending = false, onNavigate }: { dashboard: DashboardSnapshot | null; pending?: boolean; onNavigate?: (page: Page) => void }) {
  if (pending) return <LoadingState message={t('Reading runtime signals...')}/>
  if (!dashboard) return <EmptyState title={t('Not Available')}>{t('The ASYQY AI OFFICE API could not be reached. Start it with')} <code>npm run dev</code>.</EmptyState>
  const { runtime, tasks, calendar, activity, knowledge, channels, office, commands } = dashboard
  const go = (page: Page) => onNavigate ? () => onNavigate(page) : undefined
  const openTasks = Object.entries(tasks.byStatus).filter(([status]) => !['done', 'archived'].includes(status)).reduce((sum, [, count]) => sum + count, 0)
  const statuses = orderedStatuses(Object.keys(tasks.byStatus))
  const hermesMissing = /not installed/i.test(runtime.profiles.error?.message ?? '')

  return <div className="stats-view">
    {hermesMissing && <section className="notice" role="status"><strong>{t('Hermes CLI not found.')}</strong> {t('ASYQY AI OFFICE reads everything through the hermes command. Install Hermes Agent and make sure')} <code>hermes</code> {t('is on the PATH of the shell that runs')} <code>npm run dev</code>{t(', then press Refresh all.')}</section>}
    <section className="stat-grid" aria-label={t('Key statistics')}>
      <StatTile label={t('Gateways running')} value={`${office.gatewaysReachable} / ${office.gatewaysDeclared}`} detail={t('Hermes profiles')} onClick={go('Agents')}/>
      <StatTile label={t('Crew active')} value={`${office.active} / ${office.declared}`} detail={`${office.idle} ${t('idle')} · ${office.offline} ${t('offline')} · ${office.unknown} ${t('unknown')}`} />
      <StatTile label={t('Open tasks')} value={tasks.availability === 'available' ? formatNumber(openTasks) : t('Not Available')} detail={tasks.availability === 'available' ? `${formatNumber(tasks.total)} ${t('total')} · ${tasks.byStatus.running ?? 0} ${t('running')}` : undefined} onClick={go('Task Board')}/>
      <StatTile label={t('Scheduled jobs')} value={availableCount(calendar)} detail={calendar.availability === 'available' ? `${calendar.active} ${t('active')} · ${calendar.paused} ${t('paused')}` : undefined} onClick={go('Calendar')}/>
      <StatTile label={t('Recent sessions')} value={availableCount(activity)} detail={channels.activeSessions !== undefined ? `${channels.activeSessions} ${t('active now')}` : t('Last 20 listed')} onClick={go('Activity')}/>
      <StatTile label={t('Enabled skills')} value={availableCount(knowledge)} detail={knowledge.availability === 'available' ? `${Object.keys(knowledge.byCategory).length} ${t('categories')}` : undefined} onClick={go('Folders')}/>
      <StatTile label={t('Channels')} value={availableCount(channels, t('configured'))} detail={channels.availability === 'available' ? `${channels.connected} ${t('connected')}` : undefined} />
      <StatTile label={t('CLI reads')} value={formatNumber(commands.total)} detail={`${commands.failed} ${t('failed')} · ${commands.averageMs} ms ${t('avg')}`} onClick={go('Logs')}/>
    </section>

    <TokenUsage/>

    <section className="dash-grid">
      <article className="card">
        <p className="eyebrow">{t('KANBAN BY STATUS')}</p>
        {tasks.availability === 'unavailable' ? <p className="muted">{t('Not Available')}</p> : tasks.total === 0 ? <p className="muted">{t('No tasks on the board.')}</p> : <>
          <div className="stack-bar" role="img" aria-label={statuses.map((status) => `${status} ${tasks.byStatus[status]}`).join(', ')}>{statuses.map((status) => <i key={status} className={`tone-${statusTone(status)}`} style={{ flexGrow: tasks.byStatus[status] }} title={`${status}: ${tasks.byStatus[status]}`}/>)}</div>
          <ul className="legend">{statuses.map((status) => <li key={status}><i className={`tone-${statusTone(status)}`}/>{status}<b>{tasks.byStatus[status]}</b></li>)}</ul>
          <p className="card-note">{tasks.assigned} {t('of')} {tasks.total} {t('tasks have an assignee.')}</p>
        </>}
      </article>

      <article className="card">
        <p className="eyebrow">{t('RUNTIME')}</p>
        <dl className="runtime-list">
          <div><dt>{t('Hermes profiles')}</dt><dd>{runtime.profiles.availability === 'available' ? runtime.profiles.data.length : t('Not Available')}</dd></div>
          <div><dt>{t('Gateways running')}</dt><dd>{runtime.profiles.availability === 'available' ? `${runtime.profiles.data.filter((profile) => profile.gateway === 'Running').length} ${t('of')} ${runtime.profiles.data.length}` : t('Not Available')}</dd></div>
          <div><dt>{t('Models in use')}</dt><dd>{runtime.profiles.availability === 'available' ? [...new Set(runtime.profiles.data.map((profile) => profile.model).filter((model) => model !== 'Not configured'))].join(', ') || '—' : t('Not Available')}</dd></div>
          <div><dt>OpenCode</dt><dd>{runtime.openCode.availability === 'available' ? runtime.openCode.data : t('Not installed')}</dd></div>
        </dl>
      </article>

      <article className="card">
        <p className="eyebrow">{t('UP NEXT')}</p>
        <dl className="runtime-list">
          <div><dt>{t('Next cron run')}</dt><dd>{calendar.availability === 'unavailable' ? t('Not Available') : formatDateTime(calendar.nextRun)}</dd></div>
          <div><dt>{t('Latest session')}</dt><dd>{activity.availability === 'unavailable' ? t('Not Available') : activity.latest ? `${activity.latest.title} · ${activity.latest.lastActive}` : '—'}</dd></div>
          <div><dt>{t('Skill categories')}</dt><dd>{knowledge.availability === 'unavailable' ? t('Not Available') : Object.entries(knowledge.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category, count]) => `${category} (${count})`).join(', ') || '—'}</dd></div>
        </dl>
      </article>
    </section>
    <p className="card-note">{t('Live reads from Hermes and OpenCode, cached server-side for 10 seconds and refreshed automatically.')}</p>
  </div>
}

import { agentLabel } from '../format.ts'
import { t } from '../i18n.ts'
import type { OfficeSnapshot, RuntimeSnapshot } from '../types.ts'
import { usePolling } from '../polling.ts'
import { EmptyState, LoadingState, PageTitle, RuntimeBadge } from '../ui.tsx'
import { PixelCharacter } from './Office.tsx'

/** Every Hermes profile on this machine is an agent, plus OpenCode when it is installed. */
export function Agents({ runtime, pending = false }: { runtime: RuntimeSnapshot | null; pending?: boolean }) {
  const office = usePolling<OfficeSnapshot>('/api/office', 15_000)
  if (pending) return <><PageTitle eyebrow={t('CREW')} title={t('Agents')}/><LoadingState message={t('Reading runtime details...')}/></>
  if (!runtime || runtime.profiles.availability === 'unavailable') return <><PageTitle eyebrow={t('CREW')} title={t('Agents')}/><EmptyState title={t('Not Available')}>{t('The Hermes profile list could not be read. Is')} <code>hermes</code> {t('on the PATH of the server?')}</EmptyState></>
  const states = new Map(office.status === 'ready' ? office.data.stations.map((station) => [station.id, station]) : [])
  const openCode = runtime.openCode.availability === 'available' ? runtime.openCode.data : undefined
  const cards = [
    ...runtime.profiles.data.map((profile) => ({ id: profile.name, kind: t('Hermes profile'), model: profile.model, gateway: profile.gateway })),
    ...(openCode ? [{ id: 'opencode', kind: `OpenCode ${t('(CLI tool)')}`, model: openCode, gateway: undefined }] : []),
  ]
  return <><PageTitle eyebrow={t('CREW')} title={t('Agents')}>{t('Every Hermes profile on this machine (from')} <code>hermes profile list</code>{t(') is an agent')}{openCode ? t(', plus OpenCode') : ''}{t('. Nothing is configured by hand: new profiles appear here and in the office automatically.')}</PageTitle>
    <section className="agent-grid">{cards.map((card) => {
      const station = states.get(card.id)
      return <article className="agent-card" key={card.id}>
        <span className="folder-glyph" aria-hidden="true"><PixelCharacter agent={card.id}/></span>
        <div className="agent-card-body">
          <h2>{station?.privacy === 'locked' ? '🔒 ' : ''}{agentLabel(card.id)}</h2>
          <p className="muted">{card.kind}</p>
          <dl>
            <div><dt>{t('Model')}</dt><dd>{card.model}</dd></div>
            <div><dt>{t('Gateway')}</dt><dd>{card.gateway ? <RuntimeBadge source={{ availability: 'available', data: card.gateway }}/> : <span className="muted">{t('None (CLI tool)')}</span>}</dd></div>
            <div><dt>{t('In the office')}</dt><dd>{station ? `${station.state}${station.activity ? ` · ${station.activity}` : ''}` : '—'}</dd></div>
          </dl>
        </div>
      </article>
    })}</section>
  </>
}

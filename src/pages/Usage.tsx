import { t } from '../i18n.ts'
import { PageTitle } from '../ui.tsx'
import { TokenUsage } from './TokenUsage.tsx'

/** Token usage of the whole crew as its own page (also in the Office: Tokens button, and Panel → Stats). */
export function Usage() {
  return <><PageTitle eyebrow="HERMES INSIGHTS" title={t('Token usage')}>{t('Which agents, kinds of work and models use the most tokens, from')} <code>hermes insights</code> {t('of every agent.')}</PageTitle>
    <div className="usage-page"><TokenUsage/></div></>
}

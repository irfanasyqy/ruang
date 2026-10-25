import { useState, type FormEvent } from 'react'
import { t } from '../i18n.ts'
import { PinInput } from '../ProfileLock.tsx'
import { usePolling } from '../polling.ts'
import { profileLockRequest, useProfileLock, type ProfileLockStatus } from '../profile-lock.ts'
import type { RuntimeSnapshot } from '../types.ts'

type Mode = 'idle' | 'setup' | 'agents' | 'pin' | 'off'

/** Pick the agents whose private data needs the PIN, and manage that one 6-digit PIN. */
export function ProfileLockSettings() {
  const status = useProfileLock()
  const runtime = usePolling<RuntimeSnapshot>('/api/runtime', 60_000)
  const [mode, setMode] = useState<Mode>('idle')
  const [message, setMessage] = useState<string>()
  const agents = runtime.status === 'ready' ? [
    ...(runtime.data.profiles.availability === 'available' ? runtime.data.profiles.data.map((profile) => profile.name) : []),
    ...(runtime.data.openCode.availability === 'available' ? ['opencode'] : []),
  ] : []
  const finish = (text: string) => () => { setMode('idle'); setMessage(text) }
  const start = (next: Mode) => () => { setMessage(undefined); setMode(next) }
  return <section className="card settings-card" aria-labelledby="profile-lock-title">
    <div className="settings-head"><div><p className="eyebrow">{t('PRIVACY')}</p><h2 id="profile-lock-title">{t('Profile lock')}</h2></div>{status && <span className={`badge ${status.enabled ? 'good' : 'muted'}`}>{status.enabled ? `${t('On')} · ${status.agents.length} ${t('locked')}` : t('Off')}</span>}</div>
    <p className="muted">{t('Like app lock on a phone: pick agents and set one 6-digit PIN. Locked agents still work and walk around the office, but their memory, files, Kanban tasks, cron job names, live activity and (for')} <code>default</code>{t(') sessions and logs stay private until the PIN opens that agent in this browser for')} {status?.unlockMinutes ?? 15} {t('minutes. The server withholds the data, not just the page.')}</p>
    {!status ? <p className="muted">{t('Loading…')}</p> : <>
      {status.enabled && <p className="small-note">{t('Locked:')} {status.agents.length ? status.agents.map((agent) => `${agent}${status.unlocked.includes(agent) ? t(' (unlocked here)') : ''}`).join(', ') : t('no agents yet')}.</p>}
      {message && mode === 'idle' && <p className="form-success" role="status">{message}</p>}
      {mode === 'idle' && <div className="access-actions">
        {status.enabled ? <>
          <button type="button" className="primary-button" onClick={start('agents')}>{t('Choose agents')}</button>
          <button type="button" className="refresh-button" onClick={start('pin')}>{t('CHANGE PIN')}</button>
          <button type="button" className="refresh-button" onClick={start('off')}>{t('TURN OFF')}</button>
          {status.unlocked.length > 0 && <button type="button" className="refresh-button" onClick={() => void profileLockRequest('lock').then(() => setMessage(t('Every agent is locked again in this browser.')))}>{t('🔒 LOCK ALL AGAIN')}</button>}
        </> : <button type="button" className="primary-button" onClick={start('setup')}>{t('Set up profile lock')}</button>}
      </div>}
      {mode === 'setup' && <LockForm kind="setup" agents={agents} status={status} onDone={finish(t('Profile lock is on.'))} onCancel={() => setMode('idle')}/>}
      {mode === 'agents' && <LockForm kind="agents" agents={agents} status={status} onDone={finish(t('Locked agents saved.'))} onCancel={() => setMode('idle')}/>}
      {mode === 'pin' && <LockForm kind="pin" agents={agents} status={status} onDone={finish(t('New PIN saved. Every unlocked agent is locked again.'))} onCancel={() => setMode('idle')}/>}
      {mode === 'off' && <LockForm kind="off" agents={agents} status={status} onDone={finish(t('Profile lock is off. Every agent is visible.'))} onCancel={() => setMode('idle')}/>}
      <p className="small-note">{t('Lost the PIN? On the machine that runs ASYQY AI OFFICE, run')} <code>asyqy profile-lock off</code>.</p>
    </>}
  </section>
}

function LockForm({ kind, agents, status, onDone, onCancel }: { kind: 'setup' | 'agents' | 'pin' | 'off'; agents: string[]; status: ProfileLockStatus; onDone: () => void; onCancel: () => void }) {
  const [chosen, setChosen] = useState<string[]>(kind === 'agents' ? status.agents : [])
  const [pin, setPin] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const choosing = kind === 'setup' || kind === 'agents'
  const newPin = kind === 'setup' || kind === 'pin'
  const toggle = (agent: string) => setChosen((list) => list.includes(agent) ? list.filter((item) => item !== agent) : [...list, agent])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const fresh = kind === 'setup' ? pin : next
    if (newPin && (fresh.length !== 6 || fresh !== repeat)) { setError(fresh.length !== 6 ? t('The PIN has 6 digits.') : t('The two PINs do not match.')); return }
    if (kind !== 'setup' && pin.length !== 6) { setError(t('Enter the current 6-digit PIN.')); return }
    if (kind === 'setup' && chosen.length === 0) { setError(t('Pick at least one agent to lock.')); return }
    setBusy(true)
    setError(undefined)
    const result = kind === 'setup' ? await profileLockRequest('setup', { pin, agents: chosen })
      : kind === 'agents' ? await profileLockRequest('update', { pin, agents: chosen })
        : kind === 'pin' ? await profileLockRequest('update', { pin, newPin: next })
          : await profileLockRequest('disable', { pin })
    setBusy(false)
    if (result.ok) onDone(); else { setError(result.message); setPin('') }
  }
  // Agents locked before but no longer listed (e.g. a removed profile) stay choosable.
  const list = [...new Set([...agents, ...status.agents])]
  return <form className="access-setup" onSubmit={submit}>
    {choosing && <fieldset className="lock-agents"><legend className="field-label">{t('Agents to lock')}</legend>
      {list.length === 0 ? <p className="muted">{t('No agents found.')}</p> : list.map((agent) => <label key={agent} className={`lock-agent${chosen.includes(agent) ? ' active' : ''}`}><input type="checkbox" checked={chosen.includes(agent)} onChange={() => toggle(agent)}/> {chosen.includes(agent) ? '🔒' : '🔓'} {agent}</label>)}
    </fieldset>}
    {kind === 'setup' ? <>
      <PinInput id="lock-new-pin" value={pin} onChange={setPin} label={t('New 6-digit PIN')} autoFocus/>
      <PinInput id="lock-repeat-pin" value={repeat} onChange={setRepeat} label={t('Repeat the PIN')}/>
      <p className="small-note">{t('There is no PIN reset in the app. Remember it, or use')} <code>asyqy profile-lock off</code> {t('on the machine.')}</p>
    </> : <PinInput id="lock-current-pin" value={pin} onChange={setPin} label={t('Current PIN')} autoFocus/>}
    {kind === 'pin' && <>
      <PinInput id="lock-next-pin" value={next} onChange={setNext} label={t('New 6-digit PIN')}/>
      <PinInput id="lock-next-repeat" value={repeat} onChange={setRepeat} label={t('Repeat the new PIN')}/>
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="access-actions">
      <button type="submit" className={`primary-button${kind === 'off' ? ' danger' : ''}`} disabled={busy}>{busy ? t('Saving…') : kind === 'setup' ? t('Turn on profile lock') : kind === 'agents' ? t('Save locked agents') : kind === 'pin' ? t('Save new PIN') : t('Turn off profile lock')}</button>
      <button type="button" className="refresh-button" onClick={onCancel}>{t('CANCEL')}</button>
    </div>
  </form>
}

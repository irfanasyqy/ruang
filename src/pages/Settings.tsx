import { useState, type FormEvent } from 'react'
import { accessRequest, downloadCode, generateCode, type AccessStatus } from '../access.ts'
import { formatDateTime } from '../format.ts'
import { t } from '../i18n.ts'
import { PageTitle } from '../ui.tsx'
import { ProfileLockSettings } from './ProfileLockSettings.tsx'

type Mode = 'idle' | 'set' | 'off'

function CodeField({ id, label, value, onChange, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return <><label className="field-label" htmlFor={id}>{label}</label>
    <div className="code-input-row"><input id={id} className="text-input" type={show ? 'text' : 'password'} autoComplete={autoComplete} spellCheck={false} value={value} onChange={(event) => onChange(event.target.value)}/><button type="button" className="refresh-button" onClick={() => setShow(!show)} aria-pressed={show} aria-label={`${show ? t('Hide') : t('Show')} ${label.toLowerCase()}`}>{show ? t('HIDE') : t('SHOW')}</button></div></>
}

/** Turn the access code on, or replace it: a generated code (default) or a custom one. */
function CodeSetup({ status, onDone, onCancel }: { status: AccessStatus; onDone: (status: AccessStatus) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<'generated' | 'custom'>('generated')
  const [generated, setGenerated] = useState(() => generateCode())
  const [custom, setCustom] = useState('')
  const [confirm, setConfirm] = useState('')
  const [current, setCurrent] = useState('')
  const [saved, setSaved] = useState(false)
  const [remember, setRemember] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const code = kind === 'generated' ? generated : custom.trim()
  const customProblem = kind === 'custom' && (code.length < status.minLength ? `${t('Use at least')} ${status.minLength} ${t('characters.')}` : custom !== confirm ? t('The two codes do not match.') : undefined)
  const changeCode = (next: () => void) => { next(); setSaved(false); setCopied(false) }

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true) } catch { setError(t('Copy is not available here. Download the code instead.')) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (customProblem) { setError(customProblem); return }
    if (status.enabled && !current.trim()) { setError(t('Enter the current access code.')); return }
    setBusy(true)
    setError(undefined)
    const result = await accessRequest('code', { code, remember, ...(status.enabled ? { currentCode: current } : {}) })
    setBusy(false)
    if (result.ok) onDone(result.status); else setError(result.message)
  }

  return <form className="access-setup" onSubmit={submit}>
    <fieldset className="segmented"><legend className="field-label">{t('Code')}</legend>
      <label className={kind === 'generated' ? 'active' : ''}><input type="radio" name="code-kind" checked={kind === 'generated'} onChange={() => changeCode(() => setKind('generated'))}/> {t('Generate')}</label>
      <label className={kind === 'custom' ? 'active' : ''}><input type="radio" name="code-kind" checked={kind === 'custom'} onChange={() => changeCode(() => setKind('custom'))}/> {t('Custom')}</label>
    </fieldset>
    {kind === 'generated'
      ? <div className="generated-code"><code aria-label={t('Generated access code')}>{generated}</code><button type="button" className="refresh-button" onClick={() => changeCode(() => setGenerated(generateCode()))}>{t('↻ ANOTHER')}</button></div>
      : <><CodeField id="custom-code" label={t('New access code')} value={custom} onChange={(value) => changeCode(() => setCustom(value))} autoComplete="new-password"/>
        <CodeField id="confirm-code" label={t('Repeat the new code')} value={confirm} onChange={setConfirm} autoComplete="new-password"/>
        <p className="small-note">{t('At least')} {status.minLength} {t('characters. Spaces at the start and end are ignored.')}</p></>}
    <p className="muted">{t('ASYQY AI OFFICE has no password reset, so keep a copy of the code. It is only shown here, while you set it.')}</p>
    <div className="access-actions">
      <button type="button" className="refresh-button" onClick={() => downloadCode(code)} disabled={Boolean(customProblem) || !code}>{t('⬇ DOWNLOAD .TXT')}</button>
      <button type="button" className="refresh-button" onClick={() => void copy()} disabled={Boolean(customProblem) || !code}>{copied ? t('✓ COPIED') : t('COPY')}</button>
    </div>
    {status.enabled && <CodeField id="current-code" label={t('Current access code')} value={current} onChange={setCurrent} autoComplete="current-password"/>}
    <label className="check-label"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)}/> {t('I have saved this code (downloaded or copied)')}</label>
    <label className="check-label"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/> {t('Remember this device for')} {status.rememberDays} {t('days')}</label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="access-actions">
      <button type="submit" className="primary-button" disabled={!saved || busy}>{busy ? t('Saving…') : status.enabled ? t('Save new code') : t('Turn on access code')}</button>
      <button type="button" className="refresh-button" onClick={onCancel}>{t('CANCEL')}</button>
    </div>
  </form>
}

function TurnOff({ onDone, onCancel }: { onDone: (status: AccessStatus) => void; onCancel: () => void }) {
  const [current, setCurrent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!current.trim()) { setError(t('Enter the current access code.')); return }
    setBusy(true)
    const result = await accessRequest('disable', { currentCode: current })
    setBusy(false)
    if (result.ok) onDone(result.status); else setError(result.message)
  }
  return <form className="access-setup" onSubmit={submit}>
    <p className="muted">{t('Anyone who can open this address will see ASYQY AI OFFICE without a code.')}</p>
    <CodeField id="disable-code" label={t('Current access code')} value={current} onChange={setCurrent} autoComplete="current-password"/>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="access-actions"><button type="submit" className="primary-button danger" disabled={busy}>{busy ? t('Turning off…') : t('Turn off access code')}</button><button type="button" className="refresh-button" onClick={onCancel}>{t('CANCEL')}</button></div>
  </form>
}

export function Settings({ access, onAccessChange }: { access: AccessStatus | undefined; onAccessChange: (status: AccessStatus) => void }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [message, setMessage] = useState<string>()
  const done = (text: string) => (status: AccessStatus) => { setMode('idle'); setMessage(text); onAccessChange(status) }
  const lock = async () => {
    const result = await accessRequest('lock')
    if (result.ok) onAccessChange(result.status)
  }
  return <><PageTitle eyebrow="ASYQY AI OFFICE" title={t('Settings')}>{t('Settings of this ASYQY AI OFFICE server. Hermes itself stays read-only.')}</PageTitle>
    <section className="card settings-card" aria-labelledby="access-title">
      <div className="settings-head"><div><p className="eyebrow">{t('SECURITY')}</p><h2 id="access-title">{t('Access code')}</h2></div>{access && <span className={`badge ${access.enabled ? 'good' : 'muted'}`}>{access.enabled ? t('On') : t('Off')}</span>}</div>
      <p className="muted">{t('Ask for a code every time ASYQY AI OFFICE is opened in a browser. Like an API key: you generate (or choose) it once, download it, and enter it when asked. Only a hash is stored on the server.')}</p>
      {!access ? <p className="muted">{t('Loading…')}</p> : <>
        {access.enabled && access.since && <p className="small-note">{t('Set')} {formatDateTime(access.since)}.</p>}
        {message && mode === 'idle' && <p className="form-success" role="status">{message}</p>}
        {mode === 'idle' && <div className="access-actions">
          {access.enabled
            ? <><button type="button" className="primary-button" onClick={() => { setMessage(undefined); setMode('set') }}>{t('Change code')}</button><button type="button" className="refresh-button" onClick={() => { setMessage(undefined); setMode('off') }}>{t('TURN OFF')}</button><button type="button" className="refresh-button" onClick={() => void lock()}>{t('LOCK THIS BROWSER')}</button></>
            : <button type="button" className="primary-button" onClick={() => { setMessage(undefined); setMode('set') }}>{t('Set up access code')}</button>}
        </div>}
        {mode === 'set' && <CodeSetup status={access} onDone={done(access.enabled ? t('New access code saved. Other browsers have been signed out.') : t('Access code is on. Other browsers now need the code.'))} onCancel={() => setMode('idle')}/>}
        {mode === 'off' && <TurnOff onDone={done(t('Access code is off.'))} onCancel={() => setMode('idle')}/>}
        <p className="small-note">{t('Lost the code? On the machine that runs ASYQY AI OFFICE, run')} <code>asyqy access-code off</code> {t('(or')} <code>asyqy access-code new</code> {t('for a new random code).')}</p>
      </>}
    </section>
    <ProfileLockSettings/>
  </>
}

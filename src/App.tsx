import { useEffect, useRef, useState } from 'react'
import { formatTime } from './format.ts'
import { Activity } from './pages/Activity.tsx'
import { Agents } from './pages/Agents.tsx'
import { Calendar } from './pages/Calendar.tsx'
import { Folders } from './pages/Folders.tsx'
import { Logs } from './pages/Logs.tsx'
import { Memory } from './pages/Memory.tsx'
import { Office } from './pages/Office.tsx'
import { Settings } from './pages/Settings.tsx'
import { Usage } from './pages/Usage.tsx'
import { TaskBoard } from './pages/TaskBoard.tsx'
import { LOCKED_EVENT, loadAccess, type AccessStatus } from './access.ts'
import { currentLang, t, toggleLang } from './i18n.ts'
import { PROFILES_CHANGED } from './profile-lock.ts'
import { LockScreen } from './LockScreen.tsx'
import { API_VERSION } from './api-version.ts'
import { RefreshContext, usePolling } from './polling.ts'
import { usePreferences } from './preferences.ts'
import { HOME, navigation, pageFromHash, pageSlug, type Page } from './routes.ts'
import type { DashboardSnapshot } from './types.ts'

function currentPage(): Page {
  return typeof window === 'undefined' ? HOME : pageFromHash(window.location.hash)
}

function Shell({ onRefresh, access, onAccessChange }: { onRefresh: () => void; access: AccessStatus | undefined; onAccessChange: (status: AccessStatus) => void }) {
  const [page, setPage] = useState<Page>(currentPage)
  const { theme, toggleTheme } = usePreferences()
  // The navigation is a drawer over the page, closed by default, like a game's menu.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const drawer = useRef<HTMLElement>(null)
  const dashboard = usePolling<DashboardSnapshot>('/api/dashboard', 15_000)
  const data = dashboard.status === 'ready' ? dashboard.data : null
  const health = usePolling<{ apiVersion?: number }>('/api/health', 60_000)
  const serverVersion = health.status === 'ready' ? health.data.apiVersion ?? 0 : health.status === 'failed' && health.httpStatus === 404 ? 0 : undefined
  const versionNotice = serverVersion === undefined || serverVersion === API_VERSION ? undefined
    : serverVersion < API_VERSION ? t('The ASYQY AI OFFICE server is running an older version than this page, so newer menus (such as Memory) cannot load. Restart the server: stop it, run npm run build, then npm start (npm run dev restarts by itself).')
      : t('This page is older than the ASYQY AI OFFICE server. Reload the page (and run npm run build if you use npm start).')

  useEffect(() => {
    const onHashChange = () => setPage(currentPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => { document.title = `${t(page)} · ASYQY AI OFFICE` }, [page])
  useEffect(() => {
    if (menuOpen) drawer.current?.querySelector<HTMLElement>('nav a[aria-current="page"], nav a')?.focus()
  }, [menuOpen])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) { closeMenu(); return }
      if (event.key.toLowerCase() !== 'm' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      if (menuOpen) closeMenu(); else setMenuOpen(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const closeMenu = () => {
    setMenuOpen(false)
    menuButton.current?.focus()
  }

  const navigate = (next: Page) => {
    window.location.hash = `/${pageSlug(next)}`
    setPage(next)
    setMenuOpen(false)
    window.scrollTo?.({ top: 0 })
  }
  const syncLabel = data ? `${t('SYNCED')} ${formatTime(data.fetchedAt)}${dashboard.status === 'ready' && dashboard.stale ? ` · ${t('STALE')}` : ''}` : dashboard.status === 'failed' ? t('API NOT AVAILABLE') : t('CONNECTING...')

  const alerts = (data && data.commands.failed > 0 ? 1 : 0)
  const content = page === 'Agents' ? <Agents runtime={data?.runtime ?? null} pending={dashboard.status === 'pending'}/> : page === 'Office' ? <Office dashboard={data} dashboardPending={dashboard.status === 'pending'} onNavigate={navigate}/> : page === 'Usage' ? <Usage/>: page === 'Task Board' ? <TaskBoard/> : page === 'Calendar' ? <Calendar/> : page === 'Activity' ? <Activity/> : page === 'Memory' ? <Memory onOpenFolders={() => navigate('Folders')}/> : page === 'Folders' ? <Folders/> : page === 'Settings' ? <Settings access={access} onAccessChange={onAccessChange}/> : <Logs/>

  return <div className={`app${page === 'Office' ? ' app-office' : ''}`}>
    {menuOpen && <div className="drawer-backdrop" onClick={closeMenu} aria-hidden="true"/>}
    <aside id="app-sidebar" className="drawer" ref={drawer} hidden={!menuOpen} aria-label={t('Main')}>
      <div className="drawer-head"><a className="brand" href="#/office" onClick={(event) => { event.preventDefault(); navigate(HOME) }}>ASYQY<span>AI OFFICE</span></a><button type="button" className="icon-button" onClick={closeMenu} aria-label={t('Close menu')} title={t('Close menu (Esc)')}>✕</button></div>
      <nav aria-label={t('Main')}>{navigation.map((item) => <a href={`#/${pageSlug(item)}`} className={page === item ? 'active' : ''} aria-current={page === item ? 'page' : undefined} key={item} onClick={(event) => { event.preventDefault(); navigate(item) }}>{t(item)}{item === 'Logs' && data && data.commands.failed > 0 && <span className="nav-badge" title={t('Failed CLI reads')}>{data.commands.failed}</span>}</a>)}</nav>
      <div className="sidebar-note"><span className="dot"/> {t('READ-ONLY MODE')}</div>
      <small className="drawer-hint">{t('Press M to open or close this menu')}</small>
    </aside>
    <main><header><span className="header-title"><button type="button" ref={menuButton} className="icon-button menu-button" onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))} aria-controls="app-sidebar" aria-expanded={menuOpen} aria-label={menuOpen ? t('Close menu') : t('Open menu')} title={t('Menu (M)')}>☰{alerts > 0 && <span className="menu-alert" aria-label={`${alerts} ${t(alerts === 1 ? 'alert in the menu' : 'alerts in the menu')}`}/>}</button><span>ASYQY HQ / {t(page).toUpperCase()}</span></span><span className="header-actions"><span className={`sync-label${dashboard.status === 'failed' ? ' text-bad' : ''}`}>{syncLabel}</span><button type="button" className="icon-button lang-toggle" onClick={toggleLang} aria-label={t('Switch language')} title={t('Switch language')}>{currentLang().toUpperCase()}</button><button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? t('Switch to light mode') : t('Switch to dark mode')} title={theme === 'dark' ? t('Switch to light mode') : t('Switch to dark mode')}>{theme === 'dark' ? '☀' : '☾'}</button><button type="button" className="refresh-button" onClick={onRefresh} aria-label={t('Refresh all sources')}>{t('↻ REFRESH')}</button></span></header>
      {versionNotice && <section className="notice version-notice" role="alert"><strong>{t('Restart needed.')}</strong> {versionNotice}</section>}
      {content}
    </main></div>
}

export function App() {
  const [tick, setTick] = useState(0)
  // undefined while checking. An unreachable or older server answers no status: carry on
  // without the lock, since the server is the one that enforces it.
  const [access, setAccess] = useState<AccessStatus | undefined>()
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    let active = true
    const check = () => void loadAccess().then((status) => { if (active) { setAccess(status); setChecked(true) } })
    check()
    window.addEventListener(LOCKED_EVENT, check)
    // Unlocking or locking an agent changes what every source may show: refresh them all.
    const refresh = () => setTick((value) => value + 1)
    window.addEventListener(PROFILES_CHANGED, refresh)
    return () => { active = false; window.removeEventListener(LOCKED_EVENT, check); window.removeEventListener(PROFILES_CHANGED, refresh) }
  }, [])
  if (!checked) return <main className="lock-screen" aria-busy="true"/>
  if (access?.enabled && !access.unlocked) return <LockScreen status={access} onUnlocked={(status) => { setAccess(status); setTick((value) => value + 1) }}/>
  return <RefreshContext.Provider value={tick}><Shell access={access} onAccessChange={setAccess} onRefresh={() => setTick((value) => value + 1)}/></RefreshContext.Provider>
}

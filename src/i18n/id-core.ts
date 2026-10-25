/** Indonesian strings for the app shell, the lock screen and shared helpers. */
export const core: Record<string, string> = {
  // navigation (page ids stay English in code)
  Office: 'Kantor',
  Agents: 'Agen',
  Usage: 'Penggunaan',
  'Task Board': 'Papan Tugas',
  Calendar: 'Kalender',
  Activity: 'Aktivitas',
  Memory: 'Memori',
  Folders: 'Folder',
  Logs: 'Log',
  Settings: 'Pengaturan',

  // header / drawer
  'Close menu': 'Tutup menu',
  'Open menu': 'Buka menu',
  'Main': 'Navigasi utama',
  'Close menu (Esc)': 'Tutup menu (Esc)',
  'Menu (M)': 'Menu (M)',
  'READ-ONLY MODE': 'MODE HANYA BACA',
  'Press M to open or close this menu': 'Tekan M untuk membuka atau menutup menu',
  'Refresh all sources': 'Muat ulang semua sumber',
  '↻ REFRESH': '↻ MUAT ULANG',
  'Failed CLI reads': 'Pembacaan CLI gagal',
  'alert in the menu': 'peringatan di menu',
  'alerts in the menu': 'peringatan di menu',
  'Switch to light mode': 'Ganti ke mode terang',
  'Switch to dark mode': 'Ganti ke mode gelap',
  'Restart needed.': 'Perlu restart.',
  'SYNCED': 'TERSINKRON',
  'STALE': 'DATA LAMA',
  'API NOT AVAILABLE': 'API TIDAK TERSEDIA',
  'CONNECTING...': 'MENGHUBUNGKAN...',
  'The ASYQY AI OFFICE server is running an older version than this page, so newer menus (such as Memory) cannot load. Restart the server: stop it, run npm run build, then npm start (npm run dev restarts by itself).':
    'Server ASYQY AI OFFICE lebih lama daripada halaman ini, jadi menu baru (seperti Memori) belum bisa dimuat. Restart server: hentikan, jalankan npm run build, lalu npm start (npm run dev restart sendiri).',
  'This page is older than the ASYQY AI OFFICE server. Reload the page (and run npm run build if you use npm start).':
    'Halaman ini lebih lama daripada server ASYQY AI OFFICE. Muat ulang halaman (dan jalankan npm run build kalau memakai npm start).',

  // language switch
  'Language': 'Bahasa',
  'Switch language': 'Ganti bahasa',
  'Bahasa Indonesia': 'Bahasa Indonesia',
  'English': 'English',

  // lock screen
  'Locked': 'Terkunci',
  'Masukkan kode akses': 'Masukkan kode akses',
  'Enter access code': 'Masukkan kode akses',
  'Enter the access code.': 'Masukkan kode akses.',
  'ASYQY AI OFFICE is protected with an access code.': 'ASYQY AI OFFICE dilindungi dengan kode akses.',
  'Access code': 'Kode akses',
  'HIDE': 'SEMBUNYIKAN',
  'SHOW': 'LIHAT',
  'Remember this device for': 'Ingat perangkat ini selama',
  'days': 'hari',
  'Checking…': 'Memeriksa…',
  'Unlock': 'Buka kunci',
  'Lost the code? On the machine that runs ASYQY AI OFFICE, run': 'Kode hilang? Di mesin yang menjalankan ASYQY AI OFFICE, jalankan',

  // shared chrome (ui.tsx)
  'Loading': 'Memuat',
  'Not Available': 'Tidak tersedia',
  'Connecting': 'Menghubungkan',
  'Stale (refresh failed)': 'Data lama (muat ulang gagal)',
  'Live source': 'Sumber langsung',
  'REFRESHED': 'DIPERBARUI',
  'AWAITING REFRESH': 'MENUNGGU PEMBARUAN',
  'Refresh this source': 'Muat ulang sumber ini',
  'REFRESHING…': 'MEMUAT ULANG…',
  'This read-only source could not be reached. Is the ASYQY AI OFFICE API running?':
    'Sumber hanya-baca ini tidak bisa dihubungi. Apakah API ASYQY AI OFFICE berjalan?',
  'This read-only source could not be read.': 'Sumber hanya-baca ini tidak bisa dibaca.',
  'Close': 'Tutup',

  // request failures
  'The ASYQY AI OFFICE API could not be reached. Is the server running (npm start or npm run dev)?':
    'API ASYQY AI OFFICE tidak bisa dihubungi. Apakah server berjalan (npm start atau npm run dev)?',
  'The ASYQY AI OFFICE server does not know this endpoint, so it is running older code than this page. Stop it and start it again (npm run build, then npm start) to load the latest version.':
    'Server ASYQY AI OFFICE tidak mengenali endpoint ini, jadi kodenya lebih lama daripada halaman ini. Hentikan lalu jalankan lagi (npm run build, lalu npm start) untuk memuat versi terbaru.',
  'The ASYQY AI OFFICE API answered HTTP': 'API ASYQY AI OFFICE menjawab HTTP',
  'The ASYQY AI OFFICE API returned a response that is not JSON. Is another program using port 3001?':
    'API ASYQY AI OFFICE mengembalikan respons yang bukan JSON. Apakah ada program lain yang memakai port 3001?',
  'The ASYQY AI OFFICE server could not be reached.': 'Server ASYQY AI OFFICE tidak bisa dihubungi.',
  'The ASYQY AI OFFICE server answered HTTP': 'Server ASYQY AI OFFICE menjawab HTTP',

  // access code download file
  'ASYQY AI OFFICE access code': 'Kode akses ASYQY AI OFFICE',
  'For:': 'Untuk:',
  'Created:': 'Dibuat:',
  'Keep this file somewhere safe. ASYQY AI OFFICE has no password reset.':
    'Simpan file ini di tempat aman. ASYQY AI OFFICE tidak punya reset password.',
  'Lost the code? On the machine that runs ASYQY AI OFFICE, run:':
    'Kode hilang? Di mesin yang menjalankan ASYQY AI OFFICE, jalankan:',

  // server messages that reach the UI
  'ASYQY AI OFFICE is locked. Enter the access code.': 'ASYQY AI OFFICE terkunci. Masukkan kode akses.',
  'Wrong access code.': 'Kode akses salah.',
  'Not found': 'Tidak ditemukan',
}

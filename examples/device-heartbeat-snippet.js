// =============================================================================
// Contoh: deviceId + heartbeat realtime untuk lobby-license.js
// -----------------------------------------------------------------------------
// Ini BUKAN file yang dijalankan otomatis oleh project ini — ini cuma contoh
// kode yang perlu kamu gabungkan ke lobby-license.js kamu sendiri (file itu
// tidak ada di project yang di-upload, jadi tidak bisa diedit langsung di sini).
//
// Yang perlu diganti:
// - API_BASE: domain Vercel kamu sendiri
// - Bagian "TODO" di handleLicenseResult: sesuaikan dengan cara lobby-license.js
//   kamu menampilkan status lisensi (lanjut masuk / tampilkan pesan error, dst.)
// =============================================================================

(function () {
  const API_BASE = 'https://pb-abcde.vercel.app'; // <-- ganti ini
  const ACTIVATE_URL = `${API_BASE}/api/license/activate`;
  const RELEASE_URL = `${API_BASE}/api/license/release`;
  const DEVICE_ID_KEY = 'pbh_device_id';

  // deviceId dibuat sekali per perangkat/browser, lalu disimpan supaya tetap
  // sama tiap kali halaman ini dibuka lagi dari perangkat yang sama.
  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        'dev-' + Math.random().toString(36).slice(2) + '-' + Date.now();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  let heartbeatTimer = null;
  let currentKey = null;

  // Panggil fungsi ini seperti kamu panggil fetch(api, ...) yang lama.
  async function checkLicense(key, platform) {
    currentKey = key;
    const deviceId = getDeviceId();

    const res = await fetch(ACTIVATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, platform, deviceId }),
    });
    const data = await res.json();

    if (data.active) {
      // Lisensi valid & slot perangkat ini aman -> jaga tetap aktif dengan heartbeat.
      scheduleHeartbeat(key, platform, data.heartbeatIntervalSeconds || 60);
    } else {
      stopHeartbeat();
      // data.reason bisa salah satu dari:
      //   invalid_key | revoked | expired | device_limit_reached | too_many_attempts
      // TODO: tampilkan pesan sesuai reason di UI lobby kamu di sini.
      // Contoh reason "device_limit_reached" juga menyertakan data.activeDevices
      // dan data.maxActivations kalau mau ditampilkan ("2/1 perangkat sedang aktif").
    }

    return data; // { active, reason?, heartbeatIntervalSeconds?, activeDevices?, maxActivations? }
  }

  function scheduleHeartbeat(key, platform, intervalSeconds) {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      checkLicense(key, platform).catch(() => {
        // Gagal sekali (mis. jaringan putus sebentar) bukan masalah besar —
        // TTL sesi di server punya toleransi beberapa kali heartbeat sebelum
        // slotnya benar-benar dianggap lepas.
      });
    }, intervalSeconds * 1000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  // Opsional tapi disarankan: lepas slot seketika saat tab/app ditutup,
  // supaya perangkat lain tidak perlu menunggu TTL habis.
  window.addEventListener('beforeunload', () => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId || !currentKey) return;
    const payload = new Blob([JSON.stringify({ key: currentKey, deviceId })], {
      type: 'application/json',
    });
    navigator.sendBeacon?.(RELEASE_URL, payload);
  });

  // Dipanggil dari lobby-license.js, contoh: PBHLicense.checkLicense(kode, 'web')
  window.PBHLicense = { checkLicense, stopHeartbeat };
})();

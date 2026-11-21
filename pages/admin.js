import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS = {
  active: '#35b8a0',
  expired: '#d9a441',
  revoked: '#d9534f',
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID');
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ expiresInDays: '', maxActivations: 1, note: '' });

  const headers = useCallback(
    () => ({ 'content-type': 'application/json', 'x-admin-key': adminKey }),
    [adminKey]
  );

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/license/list', { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data.');
      setLicenses(data.licenses || []);
      setUnlocked(true);
      sessionStorage.setItem('pbh_admin_key', adminKey);
    } catch (err) {
      setError(err.message);
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [adminKey, headers]);

  useEffect(() => {
    const saved = sessionStorage.getItem('pbh_admin_key');
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (adminKey && !unlocked) loadLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  const generate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/license/generate', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          expiresInDays: form.expiresInDays || undefined,
          maxActivations: form.maxActivations || 1,
          note: form.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat kode.');
      setForm({ expiresInDays: '', maxActivations: 1, note: '' });
      loadLicenses();
    } catch (err) {
      setError(err.message);
    }
  };

  const revoke = async (key) => {
    if (!confirm(`Cabut lisensi ${key}?`)) return;
    await fetch('/api/license/revoke', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ key }),
    });
    loadLicenses();
  };

  const renew = async (key) => {
    const days = prompt('Perpanjang berapa hari?', '30');
    if (!days) return;
    await fetch('/api/license/renew', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ key, addDays: Number(days) }),
    });
    loadLicenses();
  };

  const copyKey = (key) => {
    navigator.clipboard?.writeText(key);
  };

  if (!unlocked) {
    return (
      <div className="wrap">
        <form
          className="unlock"
          onSubmit={(e) => {
            e.preventDefault();
            loadLicenses();
          }}
        >
          <h1>Panel Lisensi</h1>
          <p className="muted">Masukkan admin key untuk masuk.</p>
          <input
            type="password"
            placeholder="Admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <style jsx>{`
          .wrap {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #101826;
          }
          .unlock {
            width: min(360px, 90vw);
            padding: 28px;
            background: #182233;
            border: 1px solid #2a3648;
            border-radius: 10px;
          }
          h1 {
            margin: 0 0 6px;
            font: 600 20px system-ui, sans-serif;
            color: #e7edf5;
          }
          .muted {
            margin: 0 0 16px;
            color: #8b97a8;
            font: 14px system-ui, sans-serif;
          }
          input {
            box-sizing: border-box;
            width: 100%;
            padding: 10px 12px;
            background: #101826;
            border: 1px solid #2a3648;
            border-radius: 6px;
            color: #e7edf5;
            font: 14px system-ui, sans-serif;
          }
          button {
            margin-top: 12px;
            width: 100%;
            padding: 10px;
            background: #35b8a0;
            border: 0;
            border-radius: 6px;
            color: #0b1016;
            font: 600 14px system-ui, sans-serif;
            cursor: pointer;
          }
          .error {
            margin-top: 10px;
            color: #d9534f;
            font: 13px system-ui, sans-serif;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <h1>Panel Lisensi</h1>
        <button
          className="ghost"
          onClick={() => {
            sessionStorage.removeItem('pbh_admin_key');
            setUnlocked(false);
            setAdminKey('');
          }}
        >
          Keluar
        </button>
      </header>

      <form className="generate" onSubmit={generate}>
        <div className="field">
          <label>Masa berlaku (hari)</label>
          <input
            type="number"
            min="0"
            placeholder="kosong = tanpa batas"
            value={form.expiresInDays}
            onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Maks. perangkat</label>
          <input
            type="number"
            min="1"
            value={form.maxActivations}
            onChange={(e) => setForm({ ...form, maxActivations: e.target.value })}
          />
        </div>
        <div className="field grow">
          <label>Catatan</label>
          <input
            type="text"
            placeholder="mis. nama pembeli"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <button type="submit">Buat kode baru</button>
      </form>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Kode</th>
            <th>Status</th>
            <th>Perangkat</th>
            <th>Kedaluwarsa</th>
            <th>Catatan</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {licenses.map((lic) => (
            <tr key={lic.key}>
              <td className="mono" onClick={() => copyKey(lic.key)} title="Klik untuk menyalin">
                {lic.key}
              </td>
              <td>
                <span className="badge" style={{ color: STATUS_COLORS[lic.status] || '#8b97a8' }}>
                  {lic.status}
                </span>
              </td>
              <td>
                {lic.activations?.length || 0} / {lic.maxActivations}
              </td>
              <td>{formatDate(lic.expiresAt)}</td>
              <td className="muted">{lic.note || '—'}</td>
              <td className="actions">
                <button className="ghost" onClick={() => renew(lic.key)}>
                  Perpanjang
                </button>
                {lic.status !== 'revoked' && (
                  <button className="ghost danger" onClick={() => revoke(lic.key)}>
                    Cabut
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!licenses.length && (
            <tr>
              <td colSpan={6} className="muted empty">
                Belum ada kode lisensi.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #101826;
          color: #e7edf5;
          font: 14px system-ui, sans-serif;
          padding: 32px clamp(16px, 4vw, 48px);
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        h1 {
          margin: 0;
          font: 600 20px system-ui, sans-serif;
        }
        .generate {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: end;
          padding: 16px;
          background: #182233;
          border: 1px solid #2a3648;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field.grow {
          flex: 1;
          min-width: 160px;
        }
        label {
          font-size: 12px;
          color: #8b97a8;
        }
        input {
          padding: 8px 10px;
          background: #101826;
          border: 1px solid #2a3648;
          border-radius: 6px;
          color: #e7edf5;
          font: 14px system-ui, sans-serif;
        }
        input[type='number'] {
          width: 110px;
        }
        button {
          padding: 9px 16px;
          background: #35b8a0;
          border: 0;
          border-radius: 6px;
          color: #0b1016;
          font: 600 13px system-ui, sans-serif;
          cursor: pointer;
        }
        button.ghost {
          background: transparent;
          border: 1px solid #2a3648;
          color: #e7edf5;
          font-weight: 500;
          padding: 6px 12px;
        }
        button.ghost.danger {
          border-color: #5a2e2c;
          color: #d9534f;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid #202c3d;
        }
        th {
          color: #8b97a8;
          font-weight: 500;
          font-size: 12px;
        }
        .mono {
          font-family: ui-monospace, Menlo, Consolas, monospace;
          cursor: pointer;
        }
        .muted {
          color: #8b97a8;
        }
        .badge {
          font-weight: 600;
        }
        .actions {
          display: flex;
          gap: 8px;
          white-space: nowrap;
        }
        .empty {
          text-align: center;
          padding: 24px;
        }
        .error {
          color: #d9534f;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}

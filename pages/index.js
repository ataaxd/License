export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        background: '#101826',
        color: '#e7edf5',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: 0 }}>Server Lisensi Aktif</h1>
      <p style={{ color: '#8b97a8', margin: 0 }}>
        Hello From <code>Revoer</code>
      </p>
    </main>
  );
}

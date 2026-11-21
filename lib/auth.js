export function requireAdmin(req, res) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(500).json({
      error: 'server_misconfigured',
      message: 'ADMIN_API_KEY belum diset di Environment Variables Vercel.',
    });
    return false;
  }

  const provided = req.headers['x-admin-key'];
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }

  return true;
}

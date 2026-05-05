import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'aeton-jwt-secret-2024';

export function signToken() {
  return jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '7d' });
}

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

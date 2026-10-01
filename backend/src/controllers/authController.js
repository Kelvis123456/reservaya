import bcrypt from 'bcryptjs';
import { User } from '../models/sql/index.js';
import { signToken } from '../utils/jwt.js';

// "Ana@x.com" y "ana@x.com" eran dos cuentas, y el teclado del celular que pone la
// primera letra en mayúscula hacía fallar el login.
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : email);

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function register(req, res, next) {
  try {
    const { name, password, role } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Ese email ya está registrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role === 'owner' ? 'owner' : 'client',
    });

    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    // dos registros simultáneos con el mismo email: el segundo choca con el índice único
    if (err?.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Ese email ya está registrado' });
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

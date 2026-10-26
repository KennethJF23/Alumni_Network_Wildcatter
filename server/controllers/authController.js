const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const sign = (u) =>
  jwt.sign({ id: u._id, name: u.name, email: u.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

// POST /api/auth/signup   { name, email, password }
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!EMAIL_RE.test(email || '')) return res.status(400).json({ error: 'Invalid email address' });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
    });

    return res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login   { email, password }
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password' });

    return res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me   (needs token)
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
// controllers/authController.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'skillspire-jwt-secret-2024';

// In-memory fallback store when MongoDB is unavailable
const mockUsers = [];

let User;
try { User = require('../models/User'); } catch (e) { User = null; }

const signToken = (user) => jwt.sign(
  { id: user._id || user.id, email: user.email, name: user.name, role: user.role || 'user' },
  JWT_SECRET,
  { expiresIn: '7d' }
);

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    if (User && require('mongoose').connection.readyState === 1) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ error: 'Email already registered.' });
      const user = await User.create({ name, email, password });
      const token = signToken(user);
      return res.status(201).json({ token, user: user.toJSON(), message: 'Account created successfully!' });
    }

    // Mock fallback
    const exists = mockUsers.find(u => u.email === email);
    if (exists) return res.status(409).json({ error: 'Email already registered.' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 12);
    const user = { id: Date.now().toString(), name, email, password: hashed, role: 'user', skillsProgress: [] };
    mockUsers.push(user);
    const { password: _, ...safeUser } = user;
    const token = signToken(safeUser);
    return res.status(201).json({ token, user: safeUser, message: 'Account created successfully!' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const bcrypt = require('bcryptjs');

    if (User && require('mongoose').connection.readyState === 1) {
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ error: 'Invalid email or password.' });
      const token = signToken(user);
      return res.json({ token, user: user.toJSON(), message: 'Welcome back!' });
    }

    // Mock fallback
    const user = mockUsers.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password.' });
    const { password: _, ...safeUser } = user;
    const token = signToken(safeUser);
    return res.json({ token, user: safeUser, message: 'Welcome back!' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    if (User && require('mongoose').connection.readyState === 1) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      return res.json({ user });
    }
    const user = mockUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login, getMe };

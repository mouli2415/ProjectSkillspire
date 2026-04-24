// server.js — SkillSpire Backend Entry Point
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { Server } = require('socket.io');

// ── Routes
const authRoutes = require('./routes/authRoutes');
const skillRoutes = require('./routes/skillRoutes');
const jobRoutes = require('./routes/jobRoutes');
const contactRoutes = require('./routes/contactRoutes');

// ── EventEmitter usage (Node.js syllabus concept)
const appEvents = new EventEmitter();
appEvents.on('db:connected', () => console.log('📡 [Event] Database connected event fired'));
appEvents.on('server:started', (port) => console.log(`🚀 [Event] Server started on port ${port}`));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'skillspire-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ── Static frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/contact', contactRoutes);

// ── Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SkillSpire API' });
});

// ── Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Socket.IO — live chat/help feature
io.on('connection', (socket) => {
  console.log('💬 User connected:', socket.id);
  socket.on('chat:message', (data) => {
    io.emit('chat:message', { ...data, timestamp: new Date().toISOString() });
  });
  socket.on('disconnect', () => console.log('💬 User disconnected:', socket.id));
});

// ── MongoDB Connection (with fallback to in-memory mock)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skillspire';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    appEvents.emit('db:connected');
    await seedDatabase();
  })
  .catch((err) => {
    console.warn('⚠️  MongoDB not available, running with mock data:', err.message);
  });

// ── Seed initial data
async function seedDatabase() {
  const Skill = require('./models/Skill');
  const Job = require('./models/Job');

  const skillCount = await Skill.countDocuments();
  if (skillCount === 0) {
    await Skill.insertMany([
      { title: 'JavaScript Fundamentals', description: 'Master variables, functions, DOM, and async JS', category: 'Programming', level: 'Beginner', duration: '8 weeks', rating: 4.8, enrolled: 12400 },
      { title: 'React & Modern Frontend', description: 'Build responsive SPAs with React hooks and context', category: 'Frontend', level: 'Intermediate', duration: '10 weeks', rating: 4.9, enrolled: 9800 },
      { title: 'Node.js & Express', description: 'Server-side development with REST APIs and middleware', category: 'Backend', level: 'Intermediate', duration: '8 weeks', rating: 4.7, enrolled: 7600 },
      { title: 'MongoDB & Mongoose', description: 'NoSQL database design, CRUD, aggregations', category: 'Database', level: 'Beginner', duration: '6 weeks', rating: 4.6, enrolled: 6200 },
      { title: 'Python for Data Science', description: 'Pandas, NumPy, Matplotlib, and ML basics', category: 'Data', level: 'Intermediate', duration: '12 weeks', rating: 4.8, enrolled: 15300 },
      { title: 'UI/UX Design Principles', description: 'Figma, wireframing, user research, and prototyping', category: 'Design', level: 'Beginner', duration: '6 weeks', rating: 4.7, enrolled: 8900 },
      { title: 'Cloud & DevOps Basics', description: 'AWS, Docker, CI/CD pipelines, and deployment', category: 'DevOps', level: 'Advanced', duration: '10 weeks', rating: 4.5, enrolled: 4100 },
      { title: 'SQL & PostgreSQL', description: 'Relational databases, queries, joins, and optimization', category: 'Database', level: 'Beginner', duration: '6 weeks', rating: 4.6, enrolled: 7800 },
    ]);
    console.log('✅ Skills seeded');
  }

  const jobCount = await Job.countDocuments();
  if (jobCount === 0) {
    await Job.insertMany([
      { title: 'Full Stack Developer', company: 'TechNova Labs', location: 'Remote', type: 'Full-time', salary: '$90k–$130k', requiredSkills: ['JavaScript', 'React', 'Node.js'], description: 'Build scalable web applications end-to-end.', logo: '🏢' },
      { title: 'Frontend Engineer', company: 'PixelCraft Studio', location: 'New York, NY', type: 'Full-time', salary: '$85k–$120k', requiredSkills: ['React', 'CSS', 'TypeScript'], description: 'Craft beautiful, performant user interfaces.', logo: '🎨' },
      { title: 'Backend Developer', company: 'CloudStream Inc', location: 'Austin, TX', type: 'Full-time', salary: '$95k–$135k', requiredSkills: ['Node.js', 'MongoDB', 'AWS'], description: 'Design and maintain high-performance APIs.', logo: '☁️' },
      { title: 'Data Analyst', company: 'Insightful Co', location: 'Remote', type: 'Contract', salary: '$70k–$100k', requiredSkills: ['Python', 'SQL', 'Tableau'], description: 'Turn raw data into business insights.', logo: '📊' },
      { title: 'UI/UX Designer', company: 'Forma Digital', location: 'San Francisco, CA', type: 'Full-time', salary: '$80k–$115k', requiredSkills: ['Figma', 'User Research', 'Prototyping'], description: 'Design intuitive, delightful products.', logo: '✏️' },
      { title: 'DevOps Engineer', company: 'InfraCore Systems', location: 'Remote', type: 'Full-time', salary: '$100k–$145k', requiredSkills: ['Docker', 'AWS', 'CI/CD'], description: 'Automate and scale infrastructure reliably.', logo: '⚙️' },
    ]);
    console.log('✅ Jobs seeded');
  }
}

// ── Write server log (fs module usage)
const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
logStream.write(`[${new Date().toISOString()}] Server process started\n`);

// ── Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  appEvents.emit('server:started', PORT);
  console.log(`\n🌿 SkillSpire API running at http://localhost:${PORT}\n`);
});

module.exports = { app, io };

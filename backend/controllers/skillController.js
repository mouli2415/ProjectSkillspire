// controllers/skillController.js
let Skill, User;
try { Skill = require('../models/Skill'); User = require('../models/User'); } catch (e) {}

// Mock data fallback
const mockSkills = [
  { _id: '1', title: 'JavaScript Fundamentals', description: 'Master variables, functions, DOM, and async JS', category: 'Programming', level: 'Beginner', duration: '8 weeks', rating: 4.8, enrolled: 12400 },
  { _id: '2', title: 'React & Modern Frontend', description: 'Build responsive SPAs with React hooks and context', category: 'Frontend', level: 'Intermediate', duration: '10 weeks', rating: 4.9, enrolled: 9800 },
  { _id: '3', title: 'Node.js & Express', description: 'Server-side development with REST APIs', category: 'Backend', level: 'Intermediate', duration: '8 weeks', rating: 4.7, enrolled: 7600 },
  { _id: '4', title: 'MongoDB & Mongoose', description: 'NoSQL database design and CRUD operations', category: 'Database', level: 'Beginner', duration: '6 weeks', rating: 4.6, enrolled: 6200 },
  { _id: '5', title: 'Python for Data Science', description: 'Pandas, NumPy, Matplotlib, and ML basics', category: 'Data', level: 'Intermediate', duration: '12 weeks', rating: 4.8, enrolled: 15300 },
  { _id: '6', title: 'UI/UX Design Principles', description: 'Figma, wireframing, and user research', category: 'Design', level: 'Beginner', duration: '6 weeks', rating: 4.7, enrolled: 8900 },
  { _id: '7', title: 'Cloud & DevOps Basics', description: 'AWS, Docker, CI/CD pipelines', category: 'DevOps', level: 'Advanced', duration: '10 weeks', rating: 4.5, enrolled: 4100 },
  { _id: '8', title: 'SQL & PostgreSQL', description: 'Relational databases, queries, joins', category: 'Database', level: 'Beginner', duration: '6 weeks', rating: 4.6, enrolled: 7800 },
];

// GET /api/skills
const getSkills = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, level } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (level) filter.level = level;

    if (Skill && require('mongoose').connection.readyState === 1) {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [skills, total] = await Promise.all([
        Skill.find(filter).skip(skip).limit(parseInt(limit)),
        Skill.countDocuments(filter)
      ]);
      return res.json({ skills, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    }

    // Fallback
    let filtered = [...mockSkills];
    if (category) filtered = filtered.filter(s => s.category === category);
    if (level) filtered = filtered.filter(s => s.level === level);
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filtered.slice(start, start + parseInt(limit));
    res.json({ skills: paginated, total: filtered.length, page: parseInt(page), totalPages: Math.ceil(filtered.length / parseInt(limit)) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/skills/progress
const updateProgress = async (req, res) => {
  try {
    const { skillId, skillTitle, progress } = req.body;
    if (progress < 0 || progress > 100)
      return res.status(400).json({ error: 'Progress must be between 0 and 100.' });

    if (User && require('mongoose').connection.readyState === 1) {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      const existing = user.skillsProgress.find(s => s.skillId?.toString() === skillId);
      if (existing) {
        existing.progress = progress;
        if (progress === 100) existing.completedAt = new Date();
      } else {
        user.skillsProgress.push({ skillId, skillTitle, progress });
      }
      await user.save();
      return res.json({ message: 'Progress updated!', skillsProgress: user.skillsProgress });
    }

    res.json({ message: 'Progress updated (mock)!', progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getSkills, updateProgress };

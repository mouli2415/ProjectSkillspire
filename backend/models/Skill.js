// models/Skill.js
const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  duration: { type: String, default: '4 weeks' },
  rating: { type: Number, default: 4.5, min: 0, max: 5 },
  enrolled: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Skill', skillSchema);

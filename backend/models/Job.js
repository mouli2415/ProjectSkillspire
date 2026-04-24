// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
  salary: { type: String, default: 'Competitive' },
  requiredSkills: [{ type: String }],
  description: { type: String, default: '' },
  logo: { type: String, default: '🏢' },
  postedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Job', jobSchema);

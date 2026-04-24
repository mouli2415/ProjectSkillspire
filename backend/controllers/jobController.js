// controllers/jobController.js
let Job;
try { Job = require('../models/Job'); } catch (e) {}

const mockJobs = [
  { _id: '1', title: 'Full Stack Developer', company: 'TechNova Labs', location: 'Remote', type: 'Full-time', salary: '$90k–$130k', requiredSkills: ['JavaScript', 'React', 'Node.js'], description: 'Build scalable web applications end-to-end.', logo: '🏢', postedAt: new Date() },
  { _id: '2', title: 'Frontend Engineer', company: 'PixelCraft Studio', location: 'New York, NY', type: 'Full-time', salary: '$85k–$120k', requiredSkills: ['React', 'CSS', 'TypeScript'], description: 'Craft beautiful, performant user interfaces.', logo: '🎨', postedAt: new Date() },
  { _id: '3', title: 'Backend Developer', company: 'CloudStream Inc', location: 'Austin, TX', type: 'Full-time', salary: '$95k–$135k', requiredSkills: ['Node.js', 'MongoDB', 'AWS'], description: 'Design and maintain high-performance APIs.', logo: '☁️', postedAt: new Date() },
  { _id: '4', title: 'Data Analyst', company: 'Insightful Co', location: 'Remote', type: 'Contract', salary: '$70k–$100k', requiredSkills: ['Python', 'SQL', 'Tableau'], description: 'Turn raw data into business insights.', logo: '📊', postedAt: new Date() },
  { _id: '5', title: 'UI/UX Designer', company: 'Forma Digital', location: 'San Francisco, CA', type: 'Full-time', salary: '$80k–$115k', requiredSkills: ['Figma', 'User Research', 'Prototyping'], description: 'Design intuitive, delightful products.', logo: '✏️', postedAt: new Date() },
  { _id: '6', title: 'DevOps Engineer', company: 'InfraCore Systems', location: 'Remote', type: 'Full-time', salary: '$100k–$145k', requiredSkills: ['Docker', 'AWS', 'CI/CD'], description: 'Automate and scale infrastructure reliably.', logo: '⚙️', postedAt: new Date() },
];

// GET /api/jobs
const getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;

    if (Job && require('mongoose').connection.readyState === 1) {
      const filter = {};
      if (type) filter.type = type;
      if (search) filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { requiredSkills: { $in: [new RegExp(search, 'i')] } }
      ];
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [jobs, total] = await Promise.all([
        Job.find(filter).skip(skip).limit(parseInt(limit)).sort({ postedAt: -1 }),
        Job.countDocuments(filter)
      ]);
      return res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    }

    // Fallback
    let filtered = [...mockJobs];
    if (type) filtered = filtered.filter(j => j.type === type);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.requiredSkills.some(s => s.toLowerCase().includes(q))
      );
    }
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = filtered.slice(start, start + parseInt(limit));
    res.json({ jobs: paginated, total: filtered.length, page: parseInt(page), totalPages: Math.ceil(filtered.length / parseInt(limit)) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getJobs };

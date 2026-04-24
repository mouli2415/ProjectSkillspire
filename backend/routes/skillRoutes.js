// routes/skillRoutes.js
const express = require('express');
const router = express.Router();
const { getSkills, updateProgress } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getSkills);
router.post('/progress', protect, updateProgress);

module.exports = router;

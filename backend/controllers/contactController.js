// controllers/contactController.js
let Contact;
try { Contact = require('../models/Contact'); } catch (e) {}

const mockContacts = [];

// POST /api/contact
const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: 'All fields are required.' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });

    if (Contact && require('mongoose').connection.readyState === 1) {
      const contact = await Contact.create({ name, email, message });
      return res.status(201).json({ message: 'Message received! We\'ll be in touch soon.', contact });
    }

    // Fallback
    const contact = { id: Date.now().toString(), name, email, message, createdAt: new Date() };
    mockContacts.push(contact);
    res.status(201).json({ message: "Message received! We'll be in touch soon.", contact });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { submitContact };

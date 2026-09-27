const express = require('express');
const router = express.Router();
const controller = require('../controllers/consultationController');

// Consultation routes
router.post('/consultation', controller.createConsultation);
router.get('/consultations', controller.getAllConsultations);
router.get('/consultation/:id', controller.getConsultationById);
router.put('/consultation/:id', controller.updateConsultation);
router.delete('/consultation/:id', controller.deleteConsultation);

module.exports = router;


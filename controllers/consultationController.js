const fs = require('fs');
const path = require('path');
const Consultation = require('../models/Consultation');
const { getIsConnected } = require('../config/db');

const FALLBACK_DIR = path.join(__dirname, '..', 'submissions');
if (!fs.existsSync(FALLBACK_DIR)) {
  fs.mkdirSync(FALLBACK_DIR, { recursive: true });
}

// Helper to save fallback JSON
const saveFallbackFile = (record) => {
  try {
    const filePath = path.join(FALLBACK_DIR, `${record.referenceId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  } catch (err) {
    console.error('Error writing fallback file:', err);
  }
};

// Helper to read all fallback JSON files
const readFallbackFiles = () => {
  try {
    const files = fs.readdirSync(FALLBACK_DIR).filter((f) => f.endsWith('.json'));
    return files
      .map((f) => {
        try {
          const content = fs.readFileSync(path.join(FALLBACK_DIR, f), 'utf-8');
          const data = JSON.parse(content);
          if (!data.id) data.id = data._id || data.referenceId;
          return data;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
  } catch {
    return [];
  }
};

// 1. Create Consultation
exports.createConsultation = async (req, res) => {
  try {
    const { referenceId, patient, responses } = req.body;

    if (!referenceId) {
      return res.status(400).json({ error: 'Missing referenceId' });
    }

    const payload = {
      referenceId,
      status: 'Pending Review',
      patient: {
        fullName: patient?.fullName || responses?.fullName || 'Anonymous Patient',
        email: patient?.email || responses?.email || '',
        phone: patient?.phone || responses?.phone || '',
        dob: patient?.dob || responses?.dob || '',
        sexAtBirth: responses?.sexAtBirth || '',
        occupation: responses?.occupation || '',
      },
      practitionerNotes: '',
      doshaAssessment: { primaryDosha: '', notes: '' },
      responses: responses || {},
      submittedAt: req.body.submittedAt ? new Date(req.body.submittedAt) : new Date(),
    };

    let savedRecord = null;

    if (getIsConnected()) {
      savedRecord = await Consultation.create(payload);
    } else {
      payload._id = referenceId;
      payload.id = referenceId;
      savedRecord = payload;
    }

    // Always mirror to disk
    saveFallbackFile(savedRecord.toObject ? savedRecord.toObject() : savedRecord);

    console.log(`[Backend] Assessment Saved: ${referenceId} for ${payload.patient.fullName}`);

    return res.status(201).json({
      success: true,
      message: 'Consultation assessment received and saved successfully.',
      record: savedRecord,
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// 2. Get All Consultations (with search & filter)
exports.getAllConsultations = async (req, res) => {
  try {
    const { search, status } = req.query;

    if (getIsConnected()) {
      const query = {};

      if (status && status !== 'All') {
        query.status = status;
      }

      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [
          { 'patient.fullName': regex },
          { 'patient.email': regex },
          { 'patient.phone': regex },
          { referenceId: regex },
        ];
      }

      const records = await Consultation.find(query).sort({ submittedAt: -1, createdAt: -1 });
      return res.json({
        success: true,
        source: 'mongodb',
        total: records.length,
        records,
      });
    }

    // Fallback storage
    let records = readFallbackFiles();

    if (status && status !== 'All') {
      records = records.filter((r) => r.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      records = records.filter((r) => {
        const name = (r.patient?.fullName || '').toLowerCase();
        const email = (r.patient?.email || '').toLowerCase();
        const phone = (r.patient?.phone || '').toLowerCase();
        const ref = (r.referenceId || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || ref.includes(q);
      });
    }

    return res.json({
      success: true,
      source: 'local_file_fallback',
      total: records.length,
      records,
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// 3. Get Consultation By ID or Reference
exports.getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      let record = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        record = await Consultation.findById(id);
      }
      if (!record) {
        record = await Consultation.findOne({ referenceId: id });
      }

      if (!record) {
        return res.status(404).json({ error: 'Consultation record not found' });
      }

      return res.json({ success: true, record });
    }

    // Fallback file
    const records = readFallbackFiles();
    const record = records.find((r) => r._id === id || r.id === id || r.referenceId === id);

    if (!record) {
      return res.status(404).json({ error: 'Consultation record not found in fallback storage' });
    }

    return res.json({ success: true, record });
  } catch (error) {
    console.error('Error fetching consultation:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// 4. Update Consultation
exports.updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const { patient, status, practitionerNotes, doshaAssessment, responses } = req.body;

    if (getIsConnected()) {
      let record = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        record = await Consultation.findById(id);
      }
      if (!record) {
        record = await Consultation.findOne({ referenceId: id });
      }

      if (!record) {
        return res.status(404).json({ error: 'Record not found' });
      }

      if (patient) {
        record.patient = { ...record.patient.toObject(), ...patient };
      }
      if (status) record.status = status;
      if (practitionerNotes !== undefined) record.practitionerNotes = practitionerNotes;
      if (doshaAssessment) {
        record.doshaAssessment = { ...record.doshaAssessment.toObject(), ...doshaAssessment };
      }
      if (responses) {
        record.responses = { ...record.responses, ...responses };
      }

      await record.save();
      saveFallbackFile(record.toObject());

      return res.json({
        success: true,
        message: 'Consultation updated successfully.',
        record,
      });
    }

    // Fallback file update
    const records = readFallbackFiles();
    const index = records.findIndex((r) => r._id === id || r.id === id || r.referenceId === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Record not found in fallback storage' });
    }

    const current = records[index];
    if (patient) current.patient = { ...(current.patient || {}), ...patient };
    if (status) current.status = status;
    if (practitionerNotes !== undefined) current.practitionerNotes = practitionerNotes;
    if (doshaAssessment) current.doshaAssessment = { ...(current.doshaAssessment || {}), ...doshaAssessment };
    if (responses) current.responses = { ...(current.responses || {}), ...responses };
    current.updatedAt = new Date().toISOString();

    saveFallbackFile(current);

    return res.json({
      success: true,
      message: 'Consultation updated successfully in local storage.',
      record: current,
    });
  } catch (error) {
    console.error('Error updating consultation:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// 5. Delete Consultation
exports.deleteConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      let record = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        record = await Consultation.findByIdAndDelete(id);
      }
      if (!record) {
        record = await Consultation.findOneAndDelete({ referenceId: id });
      }
    }

    const filePath = path.join(FALLBACK_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({ success: true, message: 'Consultation deleted successfully.' });
  } catch (error) {
    console.error('Error deleting consultation:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

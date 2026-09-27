const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending Review', 'Under Review', 'Consultation Scheduled', 'Completed'],
      default: 'Pending Review',
    },
    patient: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      dob: { type: String, default: '' },
      sexAtBirth: { type: String, default: '' },
      occupation: { type: String, default: '' },
    },
    practitionerNotes: {
      type: String,
      default: '',
    },
    doshaAssessment: {
      primaryDosha: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    responses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ConsultationSchema.methods.toClient = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  return obj;
};

module.exports = mongoose.model('Consultation', ConsultationSchema);


const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Optional for guest users
    poseName: { type: String, required: true, default: 'General Pose' },
    accuracy: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, default: '' },
    landmarks: { type: String }, // JSON string of pose landmarks
    duration: { type: Number, default: 0 }, // Session duration in seconds
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
sessionSchema.index({ user: 1, date: -1 });
sessionSchema.index({ date: -1 });
sessionSchema.index({ accuracy: -1 });

// Update timestamp on save
sessionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = { Session };  
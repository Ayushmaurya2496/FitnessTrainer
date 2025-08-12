const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    poseName: { type: String, required: true },
    accuracy: { type: Number, required: true },
    feedback: { type: String },
    date: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = { Session };  
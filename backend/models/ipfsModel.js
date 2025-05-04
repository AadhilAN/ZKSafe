const mongoose = require('mongoose');

const IPFSShareSchema = new mongoose.Schema({
  shareIndex: { type: Number, required: true },
  encryptedCID: { type: String, required: true },
  iv: { type: String, required: true },
  salt : { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IPFSShare', IPFSShareSchema);
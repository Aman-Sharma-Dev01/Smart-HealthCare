// backend/models/Record.js
import mongoose from "mongoose";

const recordSchema = new mongoose.Schema({
  patientId: String,
  filePath: String,
  type: String,
  date: String,
  status: { type: String, default: "Available" },
});

export default mongoose.model("Record", recordSchema);

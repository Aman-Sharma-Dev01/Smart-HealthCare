// backend/routes/records.js
import express from "express";
import multer from "multer";
import Record from "../models/Record.js";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Upload record
router.post("/upload", upload.single("file"), async (req, res) => {
  const { patientId, type, date } = req.body;

  const newRecord = await Record.create({
    patientId,
    filePath: req.file.filename,
    type,
    date,
  });

  res.json({
    success: true,
    record: newRecord,
    qrUrl: `https://yourdomain.com/api/records/view/${newRecord._id}`,
  });
});

// Serve uploaded files
router.get("/view/:id", async (req, res) => {
  const record = await Record.findById(req.params.id);
  if (!record) return res.status(404).send("Not found");
  res.sendFile(path.resolve("uploads", record.filePath));
});

// Get all records by patient ID
router.get("/patient/:id", async (req, res) => {
  const records = await Record.find({ patientId: req.params.id });
  res.json(records);
});

export default router;

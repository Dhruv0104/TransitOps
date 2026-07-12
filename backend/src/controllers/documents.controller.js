const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { randomUUID } = require("crypto");
const prisma = require("../lib/prisma");

const UPLOAD_DIR = path.join(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["application/pdf", "image/jpeg", "image/png"];
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) {
      return cb(null, true);
    }
    return cb(
      new Error("Only PDF, JPG, JPEG, and PNG files are allowed")
    );
  },
});

async function list(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const documents = await prisma.vehicleDocument.findMany({
      where: { vehicleId: req.params.id },
      orderBy: { uploadedAt: "desc" },
    });

    return res.json({ documents });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
    });
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const title = (req.body.title || req.file.originalname || "Document").trim();
    const docType = (req.body.docType || "OTHER").trim().toUpperCase();
    const expiresAt = req.body.expiresAt
      ? new Date(req.body.expiresAt)
      : null;

    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: vehicle.id,
        title,
        docType,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        expiresAt:
          expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      },
    });

    return res.status(201).json({ document });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const document = await prisma.vehicleDocument.findFirst({
      where: { id: req.params.docId, vehicleId: req.params.id },
    });
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const filePath = path.join(UPLOAD_DIR, document.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.vehicleDocument.delete({ where: { id: document.id } });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  upload,
  list,
  create,
  remove,
  UPLOAD_DIR,
};

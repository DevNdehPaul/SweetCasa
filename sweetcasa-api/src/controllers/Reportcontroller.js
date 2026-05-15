const { PrismaClient } = require('@prisma/client');
const { cloudinary, ensureCloudinaryConfigured } = require('../lib/cloudinary')
const streamifier = require('streamifier');

const prisma = new PrismaClient();

// ─── Helper: upload a buffer to Cloudinary ────────────────────────────────────
function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ─── POST /reports ────────────────────────────────────────────────────────────
// Accepts: category, subject, description, followUp, evidence (up to 3 images)
// Auth: optional — works for both logged-in and guest users
exports.createReport = async (req, res) => {
  try {
    const { category, subject, description, followUp } = req.body;

    // Basic validation
    if (!subject?.trim()) {
      return res.status(400).json({ error: 'Subject is required.' });
    }
    if (!description?.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    // Upload evidence images to Cloudinary (if any)
    const evidenceUrls = [];
    const files = req.files || [];

    for (const file of files.slice(0, 3)) {
      const url = await uploadToCloudinary(file.buffer, 'sweetcasa/reports');
      evidenceUrls.push(url);
    }

    // Get userId from JWT if authenticated (optional)
    const userId = req.user?.id ?? null;

    // Save to DB
    const report = await prisma.report.create({
      data: {
        userId,
        category:    category || 'Other',
        subject:     subject.trim(),
        description: description.trim(),
        followUp:    followUp === 'true' || followUp === true,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
        status:      'Pending',
      },
    });

    return res.status(201).json({
      message: 'Report submitted successfully.',
      reportId: report.id,
    });
  } catch (err) {
    console.error('[REPORT] createReport error:', err);
    return res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
};

// ─── GET /reports (admin only) ────────────────────────────────────────────────
exports.getAllReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    return res.json({ reports });
  } catch (err) {
    console.error('[REPORT] getAllReports error:', err);
    return res.status(500).json({ error: 'Failed to fetch reports.' });
  }
};
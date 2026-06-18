const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { upload, importFile, previewFile, downloadTemplate } = require('../controllers/import.controller');

router.use(authenticate);

// Only IT managers and super admins can import
const requireImport = requirePermission('tickets:create');

router.get ('/template',       downloadTemplate);
router.post('/preview',  requireImport, upload.single('file'), previewFile);
router.post('/import',   requireImport, upload.single('file'), importFile);

module.exports = router;

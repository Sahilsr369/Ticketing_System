const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { exportMyData, anonymiseUser } = require('../controllers/gdpr.controller');

router.use(authenticate);
router.get('/export-my-data', exportMyData);
router.post('/anonymise/:userId', anonymiseUser);

module.exports = router;

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { registerCompany, getMyCompany, updateCompany, getDashboard } = require('../controllers/companyController');

router.use(protect, authorize('company'));
router.post('/register', registerCompany);
router.get('/me', getMyCompany);
router.put('/me', updateCompany);
router.get('/dashboard', getDashboard);

module.exports = router;

const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboard, getAllUsers, toggleUser,
  getAllCompanies, approveCompany, rejectCompany
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));
router.get('/dashboard', getDashboard);
router.get('/users', getAllUsers);
router.put('/users/:id/toggle', toggleUser);
router.get('/companies', getAllCompanies);
router.put('/companies/:id/approve', approveCompany);
router.put('/companies/:id/reject', rejectCompany);

module.exports = router;

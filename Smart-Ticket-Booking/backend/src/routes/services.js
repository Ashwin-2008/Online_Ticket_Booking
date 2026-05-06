const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createService, getMyServices, updateService, deleteService,
  searchServices, getServiceById
} = require('../controllers/serviceController');

router.get('/search', searchServices);
router.get('/:id', getServiceById);
router.use(protect, authorize('company'));
router.post('/', createService);
router.get('/my/list', getMyServices);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;

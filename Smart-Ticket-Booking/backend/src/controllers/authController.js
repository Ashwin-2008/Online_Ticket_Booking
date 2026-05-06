const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const allowedRoles = ['user', 'company'];
    const userRole = allowedRoles.includes(role) ? role : 'user';

    const user = await User.create({ name, email, password, phone, role: userRole });
    res.status(201).json({ success: true, token: generateToken(user._id), user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    let company = null;
    if (user.role === 'company') {
      company = await Company.findOne({ ownerId: user._id });
    }

    res.json({ success: true, token: generateToken(user._id), user, company });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  let company = null;
  if (req.user.role === 'company') {
    company = await Company.findOne({ ownerId: req.user._id });
  }
  res.json({ success: true, user: req.user, company });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

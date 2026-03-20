const jwt = require('jsonwebtoken');
const env = require('../config/env');

const generateToken = (id, role, garage_id = null) => {
  return jwt.sign({ id, role, garage_id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

module.exports = generateToken;
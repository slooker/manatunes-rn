// In test environments, delegate to Node.js built-in crypto
const crypto = require('crypto');
module.exports = crypto;

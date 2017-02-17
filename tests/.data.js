exports.server = 'http://localhost:8000';
exports.database = process.env.TRYTON_MODEL_TEST_DB || 'tryton';
exports.username = process.env.TRYTON_MODEL_TEST_USER || 'admin';
exports.parameters = {
  password: process.env.TRYTON_MODEL_TEST_PWD || 'admin'
};

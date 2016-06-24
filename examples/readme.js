var co = require('co');
var Session = require('tryton-session');
var model = require('..');
//
var TRYTON_SERVER = 'http://localhost:7999';
var TRYTON_DATABASE = 'tryton';
var TRYTON_LOGIN = 'admin';
var TRYTON_PASSWORD = 'admin';
//
var login = '' + Math.floor(Math.random() * 1000000);
return co(function* () {
    var session = new Session(TRYTON_SERVER, TRYTON_DATABASE);
    yield session.start(TRYTON_LOGIN, TRYTON_PASSWORD);
    var user = yield model.Record(session, 'res.user');
    yield user.setDefault();
    yield user.set({
      name: 'Test User',
      login: login,
      password: login
    });
    yield user.save();
    yield session.stop();
  })
  .then(() => console.log('ok: ' + login), (err) => console.log('ko: ' + login +
    ': ' + err));

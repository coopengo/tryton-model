var co = require('co');
var Session = require('tryton-session');
var model = require('..');
//
var TRYTON_SERVER = 'http://localhost:7999';
var TRYTON_DATABASE = 'tryton';
var TRYTON_LOGIN = 'admin';
var TRYTON_PASSWORD = 'admin';
//
return co(function* () {
    var session = new Session(TRYTON_SERVER, TRYTON_DATABASE);
    yield session.start(TRYTON_LOGIN, TRYTON_PASSWORD);
    var users = yield model.Group.search(session, 'res.user', {});
    var record = users.sample();
    yield record.read();
    return record.get('login', {
      immediate: true
    });
  })
  .then((login) => console.log('ok:' + login), (err) => console.log('ko: ' +
    err));

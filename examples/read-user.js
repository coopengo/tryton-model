var co = require('co');
var Session = require('tryton-session');
var model = require('..');
var Record = model.Record;
//
var TRYTON_SERVER = 'http://localhost:7999';
var TRYTON_DATABASE = 'coog';
var TRYTON_LOGIN = 'admin';
var TRYTON_PASSWORD = 'admin';
//
return co(function* () {
    var session = new Session(TRYTON_SERVER, TRYTON_DATABASE);
    yield session.start(TRYTON_LOGIN, TRYTON_PASSWORD);
    var user = yield Record(session, 'party.party', 1756);
    yield user.read();
    console.log(user.attrs);
  })
  .then(() => console.log('ok'), (err) => console.log('ko: ' + err));

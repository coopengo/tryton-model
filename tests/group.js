var t = require('tap');
var _ = require('lodash');
var co = require('co');
var Session = require('tryton-session');
var model = require('..');
var data = require('./.data');
//
model.init(Session);
var session = new Session(data.server, data.database);
var users;

function start() {
  return session.start(data.username, data.parameters);
}

function search() {
  return co(function* () {
    users = yield model.Group.search(session, 'res.user', {
      limit: 10
    });
    users.each((user) => {
      t.ok(user instanceof model.Record);
      t.isa(user.id, 'number');
    });
  });
}

function read() {
  return co(function* () {
    yield users.read(['name', 'login']);
    var names = users.map((user) => user.get('name', {
      inst: false
    }));
    _.each(names, (name) => t.isa(name, 'string'));
    var logins = users.map((user) => user.get('login', {
      inst: false
    }));
    _.each(logins, (login) => t.isa(login, 'string'));
  });
}

function stop() {
  return session.stop();
}
t.test(start)
  .then(search)
  .then(read)
  .then(stop)
  .catch(t.threw);

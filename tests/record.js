var _ = require('lodash');
var t = require('tap');
var co = require('co');
var Session = require('tryton-session');
var model = require('..');
var data = require('./.data');
//
model.init(Session);
var session = new Session(data.server, data.database);
var login = '' + Math.floor(Math.random() * 1000000);
var user;

function start() {
  return session.start(data.username, data.password);
}

function create() {
  return co(function* () {
    user = yield model.Record(session, 'res.user');
    t.ok(user instanceof model.Record);
  });
}

function setLogin() {
  return user.set('login', 'john');
}

function saveKO() {
  t.throws(user.save);
}

function setDefault() {
  return user.setDefault();
}

function set() {
  return user.set({
    name: 'Test User',
    login: login,
    password: login,
    groups: [1, {
      name: login
    }]
  });
}

function removeGroups() {
  var groups = user.get('groups', {
    inst: false
  });
  t.ok(_.isArray(groups));
  t.equal(groups.length, 2);
  t.ok(_.includes(groups, 1));
  return user.set('groups', '-1-');
}

function forceGroups() {
  var groups = user.get('groups', {
    inst: false
  });
  t.equal(groups.length, 1);
  return user.set('groups', [1]);
}

function checkGroups() {
  var groups = user.get('groups', {
    inst: false
  });
  t.equal(groups.length, 1);
  t.equal(groups[0], 1);
}

function save() {
  return co(function* () {
    yield user.save();
    t.ok(user.id);
    t.isa(user.id, 'number');
  });
}

function stop() {
  return session.stop();
}
t.test(start)
  .then(create)
  .then(setLogin)
  .then(saveKO)
  .then(setDefault)
  .then(set)
  .then(save)
  .then(removeGroups)
  .then(save)
  .then(forceGroups)
  .then(save)
  .then(checkGroups)
  .then(stop)
  .catch(t.threw);

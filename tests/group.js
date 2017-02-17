const t = require('tap');
const _ = require('lodash');
const co = require('co');
const Session = require('tryton-session');
const model = require('..');
const data = require('./.data');
//
model.init(Session);
const session = new Session(data.server, data.database);
let users;

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
    const names = users.map((user) => user.get('name', {
      inst: false
    }));
    _.each(names, (name) => t.isa(name, 'string'));
    const myUsers = model.Group.group(session, users.map());
    const logins = myUsers.get('login', {
      inst: false
    });
    _.each(logins, (login) => t.isa(login, 'string'));
  });
}

function readCrash() {
  return co(function* () {
    const bak = session.token;
    session.token = '123';
    yield users.read()
      .then(() => t.ok(false), (err) => t.type(err, 'object'));
    session.token = bak;
  });
}

function getNotField() {
  return co(function* () {
    yield users.read();
    t.throws(users.get.bind(users, 'hello', {
      inst: false
    }));
  });
}

function getNotRead() {
  return co(function* () {
    yield users.read();
    t.throws(users.get.bind(users, 'groups', {
      inst: false
    }));
  });
}

function stop() {
  return session.stop();
}
t.test(start)
  .then(search)
  .then(read)
  .then(readCrash)
  .then(getNotField)
  .then(getNotRead)
  .then(stop)
  .catch(t.threw);

var t = require('tap');
var co = require('co');
var Session = require('tryton-session');
var model = require('..');
var data = require('./.data');
//
model.init(Session);
var session = new Session(data.server, data.database);

function start() {
  return session.start(data.username, data.password);
}

function test() {
  return co(function* () {
    var group = yield model.Group.search(session, 'ir.cron', {});
    var rec = group.first();
    if (!rec) {
      return;
    }
    yield rec.read();
    var dt = rec.get('next_call', {
      instanciate: false
    });
    t.match(dt, /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d.\d\d\d/);
  });
}

function stop() {
  return session.stop();
}
t.test(start)
  .then(test)
  .then(stop)
  .catch(t.threw);

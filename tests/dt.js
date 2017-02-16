const t = require('tap');
const co = require('co');
const Session = require('tryton-session');
const model = require('..');
const data = require('./.data');
//
model.init(Session);
const session = new Session(data.server, data.database);

function start() {
  return session.start(data.username, data.parameters);
}

function test() {
  return co(function* () {
    const group = yield model.Group.search(session, 'ir.cron', {});
    const rec = group.first();
    if (!rec) {
      return;
    }
    yield rec.read();
    const dt = rec.get('next_call', {
      inst: false
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

require('should');
var Session = require('tryton-session');
var model = require('..');
var data = require('./.data');
//
describe('Creates a simple record', () => {
  var session = new Session(data.server, data.database);
  var login = '' + Math.floor(Math.random() * 1000000);
  var user;
  before('starts session', () => {
    return session.start(data.username, data.password);
  });
  it('creates a user instance', () => {
    return model.Record.create(session, 'res.user')
      .then((result) => {
        user = result;
      });
  });
  it('sets user defaults', () => {
    return user.setDefault();
  });
  it('sets user attributes', () => {
    return user.set({
      name: 'Test User',
      login: login,
      password: login
    });
  });
  it('saves user instance', () => {
    return user.save();
  });
  after('stops session', () => {
    return session.stop();
  });
});

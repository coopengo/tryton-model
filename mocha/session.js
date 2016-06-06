var _ = require('underscore');
require('should');
var Session = require('tryton-session');
var model = require('..');
var data = require('./.data');
//
describe('Load session access', () => {
  var session = new Session(data.server, data.database);
  before('starts session', () => {
    return session.start(data.username, data.password);
  });
  it('checks access', () => {
    session.access.should.be.Object();
    session.access.should.have.property('ir.model');
    var sample = _.sample(session.access);
    sample.should.be.Object();
    sample.should.have.property('read');
    sample.should.have.property('write');
    sample.should.have.property('delete');
    sample.should.have.property('read');
  });
  it('loads res.user model', () => {
    return model.Record.create(session, 'res.user');
  });
  it('checks model', () => {
    session.model.should.be.Object();
    session.model.should.have.property('res.user');
    var model = session.model['res.user'];
    model.should.be.Object();
  });
  after('stops session', () => {
    return session.stop();
  });
});

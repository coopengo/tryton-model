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
  it('loads a model', () => {
    return model.utils.loadModel(session, 'ir.model');
  });
  it('checks user model', () => {
    session.model.should.be.Object();
    session.model.should.have.property('ir.model');
    var model = session.model['ir.model'];
    model.should.be.Object();
  });
  after('stops session', () => {
    return session.stop();
  });
});

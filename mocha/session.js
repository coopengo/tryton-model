var _ = require('underscore');
require('should');
var Session = require('tryton-session');
var Model = require('..')
  .Model;
var data = require('./.data');
//
describe('Load session access', () => {
  var session = new Session(data.server, data.database);
  before('starts session', () => {
    return session.start(data.username, data.password);
  });
  it('checks access', () => {
    session.models.should.be.Object();
    session.models.should.have.property('ir.model');
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
    return Model.get(session, 'ir.model');
  });
  it('checks user model', () => {
    session.models.should.have.property('ir.model');
    var model = session.models['ir.model'];
    model.should.be.instanceof(Model);
  });
  after('stops session', () => {
    return session.stop();
  });
});

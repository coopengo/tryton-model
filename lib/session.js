var _ = require('underscore');
var Session = require('tryton-session');
var methods = require('./methods');
var Model = require('./model');
//
_.extendOwn(Session.serializable, {
  access: true,
  models: true
});

function loadAccess() {
  return this.rpc(methods.listModels, [])
    .then((models) => {
      this.models = _.object(models, _.map(models, () => null));
      return this.bulk(methods.getAccess, [models]);
    })
    .then((result) => {
      this.access = result;
    });
}
Session.afterLogin.push(loadAccess);

function packModel() {
  _.each(this.models, (m) => {
    delete m.session;
    _.each(m, (f) => {
      delete f.model;
    });
  });
}
Session.beforePack.push(packModel);

function unpackModel() {
  this.models = _.mapObject(this.models, (m) => {
    return new Model(this, m.name, _.mapObject(m.fields, (f) => f.desc));
  });
}
Session.afterUnpack.push(unpackModel);

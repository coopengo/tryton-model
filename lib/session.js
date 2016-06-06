var _ = require('underscore');
var Session = require('tryton-session');
var methods = require('./methods');
var field = require('./field');
//
_.extendOwn(Session.serializable, {
  access: true,
  model: true
});

function loadAccess() {
  return this.rpc(methods.listModels, [])
    .then(models => this.bulk(methods.getAccess, [models]))
    .then((result) => {
      this.access = result;
    });
}

function setModel() {
  this.model = {};
  return Promise.resolve();
}
Session.afterLogin.push(loadAccess, setModel);

function packModel() {
  _.each(this.model, (m) => {
    _.each(m, (f) => {
      delete f.session;
    });
  });
}
Session.beforePack.push(packModel);

function unpackModel() {
  this.model = _.mapObject(this.model, (m) => {
    return _.mapObject(m, (f) => {
      return field(this, f);
    });
  });
}
Session.afterUnpack.push(unpackModel);

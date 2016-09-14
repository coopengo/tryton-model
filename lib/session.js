var _ = require('underscore');
var Session = require('tryton-session');
var methods = require('./methods');
var Model = require('./model');
var debug = require('debug')('api:model:session');
var methods = require('./methods');
//
_.extendOwn(Session.serializable, {
  access: true,
  models: true,
  cache: true
});

function initModel() {
  debug('init model');
  this.models = {};
  this.cache = {};
  return this.rpc(methods.listModels, [])
    .then((models) => {
      return this.bulk(methods.getAccess, [models]);
    })
    .then((result) => {
      this.access = result;
    });
}
Session.afterLogin.push(initModel);

function packModel() {
  debug('pack model');
  _.each(this.models, (m, i, l) => {
    if (_.isPromise(m)) {
      delete l[i];
      return;
    }
    delete m.session;
    delete m.initDone;
    _.each(m.fields, (f) => {
      delete f.model;
      delete f.relation;
    });
  });
  this.cache = {};
}
Session.beforePack.push(packModel);

function unpackModel() {
  debug('unpack model');
  this.models = _.mapObject(this.models, (m) => new Model(this, m.name, _.mapObject(
    m.fields, (f) => f.desc)));
}
Session.afterUnpack.push(unpackModel);

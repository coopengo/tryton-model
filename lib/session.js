var _ = require('lodash');
var utils = require('./utils');
var methods = require('./methods');
var Model = require('./model');
var debug = require('debug')('tryton:model:session');
var methods = require('./methods');
//
module.exports = function (Session) {
  _.assign(Session.serializable, {
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
      if (utils.isPromise(m)) {
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
    this.models = _.mapValues(this.models, (m) => new Model(this, m.name, _.mapValues(
      m.fields, (f) => f.desc)));
  }
  Session.afterUnpack.push(unpackModel);
};

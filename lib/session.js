var _ = require('lodash')
var utils = require('./utils')
var methods = require('./methods')
var Model = require('./model')
var Cache = require('./cache')
var debug = require('debug')('tryton:model:session')

module.exports = function (Session) {
  _.assign(Session.serializable, {
    access: true,
    modules: true,
    models: true
  })

  Session.afterStart.push(function () {
    debug('init model')
    this.models = {}
    return this.rpc(methods.listModels, [])
      .then((models) => {
        return this.bulk(methods.getAccess, [models])
      })
      .then((result) => {
        this.access = result
      })
  })

  Session.afterStart.push(function () {
    debug('init module')
    this.modules = {}
    return Model.Group.search(this, 'ir.module',
            {domain: 'state', '=', 'activated'
        })
        .then((group) => {
        this.modules = group.toJSON(1)
        .map (m => return m.name)})
  })

  Session.afterStart.push(function () {
    this.cache = new Cache(this)
  })

  Session.beforePack.push(function () {
    debug('pack model')
    _.each(this.models, (m, i, l) => {
      if (utils.isPromise(m)) {
        delete l[i]
        return
      }
      delete m.session
      delete m.initDone
      _.each(m.fields, (f) => {
        delete f.model
        delete f.relation
      })
    })
  })

  Session.afterUnpack.push(function () {
    debug('unpack model')
    this.models = _.mapValues(this.models, (m) => new Model(this, m.name,
      _.mapValues(m.fields, (f) => f.desc)))
  })

  Session.afterUnpack.push(function () {
    this.cache = new Cache(this)
  })
}

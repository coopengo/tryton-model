var _ = require('lodash')
var assert = require('assert')
var inherits = require('inherits')
var EventEmitter = require('events')
var utils = require('./utils')
var Model = require('./model')
var methods = require('./methods')
var patch = require('./group-underscore')
var dRec = require('debug')('tryton:model:record')
var dGrp = require('debug')('tryton:model:group')

// Record class

function updateCache (oldId, newId) {
  dRec('%s(%s): mutate to %s', this.model.name, oldId, newId)
  this.session.cache.set(this.model.name, oldId, null)
  this.session.cache.set(this.model.name, newId, this)
}

function Record (session, model, id, group) {
  if (this instanceof Record) {
    this.session = session
    this.model = model
    this.id = id || -parseInt(_.uniqueId())
    dRec('%s(%s): constructor', this.model.name, this.id)
    this.session.cache.set(this.model.name, this.id, this)
    this.on('mutate', updateCache)
    this.group = group
    this.reset()
  } else {
    dRec('%s: new', model)
    var modelName = model
    return Model.get(session, modelName)
      .then((model) => {
        var cached = session.cache.get(model.name, id)
        return cached || new Record(session, model, id, group)
      })
  }
}
inherits(Record, EventEmitter)

Record.prototype.detach = function () {
  dRec('%s(%s): detach', this.model.name, this.id)
  this.session.cache.set(this.model.name, this.id, null)
  this.removeListener('mutate', updateCache)
}

function resetAttrs () {
  this.attrs = {}
  this.changes = {}
  this.readFields = this.id > 0 ? {} : {
    '*': true
  }
}

Record.prototype.reset = function () {
  dRec('%s(%s): reset', this.model.name, this.id)
  this.readPromise = false
  this.writePromise = false
  resetAttrs.call(this)
}

Record.prototype.hasChanged = function () {
  return !_.isEmpty(this.changes)
}

function setContext (key, value) {
  if (_.isNil(key)) {
    this.context = null
  } else {
    if (!this.context) {
      this.context = {}
    }
    if (_.isString(key)) {
      this.context[key] = value
    } else if (_.isPlainObject(key)) {
      _.assign(this.context, key)
    }
  }
}

Record.prototype.setContext = function (key, value) {
  dRec('%s(%s): setContext', this.model.name, this.id)
  setContext.call(this, key, value)
}
Record.prototype.getContext = function () {
  var result = {}
  if (this.group) {
    _.assign(result, this.group.getContext())
  }
  _.assign(result, this.context)
  return result
}

function instFromId (record, field, value) {
  if (field.cls === 'record') {
    assert(_.isNumber(value), 'only ids')
    return Record(record.session, field.desc.relation, value)
  } else if (field.cls === 'group') {
    assert(_.isArray(value) && _.every(value, _.isNumber), 'only ids')
    return Group(record.session, field.desc.relation, record, field.name)
      .then((group) => {
        group.init(value)
        return group
      })
  } else {
    throw new Error('bad type value')
  }
}

Record.prototype.get = function (name, options) {
  dRec('%s(%s): get', this.model.name, this.id)
  var obj
  if (_.isUndefined(name)) {
    obj = true
    options = {}
  } else if (_.isPlainObject(name)) {
    obj = true
    options = name
  } else {
    options = options || {}
  }
  var names
  if (obj) {
    names = _.keys(this.attrs)
  } else {
    if (_.isString(name)) {
      names = [name]
    } else if (_.isArray(name)) {
      names = name
    } else {
      throw new Error('bad param type')
    }
    var notField = _.filter(names, (name) => _.isUndefined(this.model.fields[name]))
    assert(_.isEmpty(notField), 'getting bad fields: ' + notField)
    if (!this.readFields['*']) {
      var notRead = _.filter(names, (name) => this.readFields[name] !== true)
      assert(_.isEmpty(notRead), 'getting unread fields: ' + notRead)
    }
  }
  assert(!_.includes(names, 'id'), 'get id')
  var notOption = _.omit(options, ['inst', 'rpc', 'oc', 'par'])
  assert(_.isEmpty(notOption), 'bad options: ' + notOption)
  _.defaults(options, {
    inst: false,
    rpc: false,
    oc: false,
    par: false
  })
  var l = _.map(names, (name) => {
    var opts = options
    var model = this.session.models[this.model.fields[name].desc.relation]
    if (model) {
      // TODO: Make sure there always is a record
      opts = _.assign({rec: new Record(this.session, model)}, opts)
    }
    var value = this.attrs[name]
    if ((value instanceof Array) && ((options.rpc) || (options.oc))) {
      value = _.map(value, (v) => {
        if (v instanceof Record) {
          return _.assign({id: v.id}, v.attrs)
        } else {
          return v
        }
      })
    }
    return {
      name: name,
      field: this.model.fields[name],
      value: this.model.fields[name].get(value, opts)
    }
  })
  var id = this.id

  function wrap () {
    if (_.isString(name)) {
      return l[0].value
    } else if (obj) {
      var res = _.zipObject(names, _.map(l, 'value'))
      res.id = id
      return res
    } else {
      return _.map(l, 'value')
    }
  }
  if (options.inst === true) {
    var toInst = _.filter(l, (e) => e.field.cls && e.value)
    return Promise.all(_.map(toInst, (e) => instFromId(this, e.field, e.value)))
      .then((instances) => {
        _.each(toInst, (e, index) => {
          e.value = instances[index]
        })
        return wrap()
      })
  } else {
    var res = wrap()
    if (obj && options.par) {
      if (this.group && this.group.origin) {
        res._parent_ = this.group.origin.get(options)
      }
    }
    return res
  }
}

function deflat (obj) {
  var res = {}
  _.each(_.keys(obj), (k) => {
    var i = k.indexOf('.')
    if (i >= 0) {
      var key = k.substr(0, i)
      var sub = k.substr(i + 1)
      if (!res[key]) {
        res[key] = {}
      }
      res[key][sub] = obj[k]
      delete obj[k]
    }
  })
  if (_.isEmpty(res)) {
    return obj
  } else {
    _.each(_.keys(obj), (k) => {
      if (res[k]) {
        res[k].id = obj[k]
        delete obj[k]
      }
    })
    res = _.mapValues(res, (v) => {
      return deflat(v)
    })
    return _.assign(obj, res)
  }
}

Record.prototype.set = function (name, value, options) {
  dRec('%s(%s): set', this.model.name, this.id)
  assert(!this.isReading(), 'set a record while reading')
  assert(!this.isWriting(), 'set a record while writing')
  var values
  if (_.isPlainObject(name)) {
    values = name
    options = value
  } else {
    values = {}
    values[name] = value
  }
  options = options || {}
  assert(_.isUndefined(values.id), 'set id')
  var notOption = _.omit(options, ['touch', 'event', 'sync', 'oc'])
  assert(_.isEmpty(notOption), 'bad options: ' + notOption)
  _.defaults(options, {
    touch: true,
    event: true,
    sync: false,
    oc: false
  })
  var changes = {}
  values = deflat(values)
  var notField = _.keys(_.pickBy(values, (v, k) => _.isUndefined(this.model.fields[k])))
  assert(_.isEmpty(notField), 'setting bad fields: ' + notField)
  if (!this.readFields['*']) {
    var notRead = _.keys(_.pickBy(values, (v, k) => this.readFields[k] !==
      true))
    assert(_.isEmpty(notRead), 'setting unread fields: ' + notRead)
  }
  var l = _.map(values, (v, k) => {
    var opts = options
    var model = this.session.models[this.model.fields[k].desc.relation]
    if (model) {
      // TODO: Make sure there always is a record
      opts = _.assign({rec_class: Record,
        rec_session: this.session,
        rec_model: model}, opts)
    }
    return {
      name: k,
      field: this.model.fields[k],
      value: this.model.fields[k].set(v, _.assign({
        old: this.attrs[k]}, opts))
    }
  })
  _.each(l, (e) => {
    var newVal = e.value
    var oldVal = this.attrs[e.name]
    if (!_.isEqual(oldVal, newVal)) {
      changes[e.name] = oldVal
      this.attrs[e.name] = newVal
    }
  })
  if (!_.isEmpty(changes)) {
    if (options.event) {
      this.emit('change')
      _.each(changes, (v, k) => {
        this.emit('change:' + k, this.attrs[k], v)
      })
    }
    if (options.touch) {
      _.forEach(changes, (v, k) => {
        if (_.isUndefined(this.changes[k])) {
          this.changes[k] = v
        } else if (_.isEqual(this.changes[k], this.attrs[k])) {
          delete this.changes[k]
        }
      })
    }
    if (options.sync) {
      var fieldNames = _.keys(changes)
      return this.onChange(fieldNames)
        .then(() => this.onChangeWith(fieldNames))
    }
  }
}

function flatten (obj, paths) {
  var values = _.map(paths, (path) => _.reduce(path.split('.'), (value, sub) => {
    if (value) {
      return value[sub]
    } else {
      return value
    }
  }, obj))
  return _.zipObject(paths, values)
}

Record.prototype.onChange = function (names) {
  dRec('%s(%s): onChange %s', this.model.name, this.id, names)
  var paths = _.uniq(_.flatten(_.map(names, (name) => this.model.fields[name]
    .desc.on_change || [])))
  if (!_.isEmpty(paths)) {
    var values = flatten(this.get({
      oc: true,
      par: true
    }), paths)
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChange, [
      values, names
    ], this.getContext())
      .then((results) => _.each(results, (result) => this.set(result, {
        oc: true
      })))
  } else {
    return Promise.resolve()
  }
}

Record.prototype.onChangeWith = function (names) {
  dRec('%s(%s): onChangeWith %s', this.model.name, this.id, names)
  var fieldNames = []
  var postponed = []
  var paths = []
  _.each(this.model.fields, (v, k) => {
    var ocw = v.desc.on_change_with || []
    if (!_.isEmpty(_.intersection(ocw, names))) {
      if (!_.isEmpty(_.intersection(ocw, fieldNames))) {
        postponed.push(k)
      } else {
        fieldNames.push(k)
        paths = _.union(paths, ocw)
      }
    }
  })
  if (!_.isEmpty(fieldNames)) {
    var values = flatten(this.get({
      oc: true,
      par: true
    }), paths)
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith, [
      values, fieldNames
    ], this.getContext())
      .then((result) => {
        this.set(result, {
          oc: true
        })
        return Promise.all(_.map(postponed, (fieldName) => {
          var values = flatten(this.get({
            rpc: true,
            par: true
          }), this.model.fields[fieldName].desc.on_change_with)
          return this.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith +
              '_' + fieldName, [values], this.getContext())
            .then((result) => this.set(result, {
              oc: true
            }))
        }))
      })
  } else {
    return Promise.resolve()
  }
}

Record.prototype.toJSON = function (depth, level, parents) {
  depth = _.isUndefined(depth) ? 1 : depth
  level = _.isUndefined(level) ? 0 : level
  parents = parents || {}
  var key = this.model.name + '-' + this.id
  if (parents[key]) {
    return {
      _: this.model.name,
      id: this.id
    }
  }
  parents = _.clone(parents)
  parents[key] = true
  var l = _.mapValues(this.attrs, (v, k) => ({
    name: k,
    field: this.model.fields[k],
    value: this.model.fields[k].get(v, {})
  }))
  var records = _.filter(l, (e) => e.field.cls === 'record')
  _.each(records, (e) => {
    var done = false
    if (level < depth) {
      var cached = this.session.cache.get(e.field.desc.relation, e.value)
      if (cached) {
        done = true
        e.value = cached.toJSON(depth, level + 1, parents)
      }
    }
    if (!done) {
      e.value = {
        _: e.field.desc.relation,
        id: e.value
      }
    }
  })
  var groups = _.filter(l, (e) => e.field.cls === 'group')
  _.each(groups, (e) => {
    var done = false
    if (level < depth) {
      var model = Model.get(this.session, e.field.desc.relation, true)
      if (model) {
        done = true
        var group = new Group(this.session, model, this, e.field.name)
        group.init(e.value)
        e.value = group.toJSON(depth, level + 1, parents)
      }
    }
    if (!done) {
      e.value = _.map(e.value, (v) => ({
        _: e.field.desc.relation,
        id: v
      }))
    }
  })
  return _.assign({
    _: this.model.name,
    id: this.id
  }, _.zipObject(_.map(l, 'name'), _.map(l, 'value')))
}

function parseReadParam (model, name) {
  var all = _.keys(model.fields)
  var eager = _.map(_.filter(model.fields, (field) => field.desc.loading ===
    'eager'), 'name')
  if (name) {
    var names
    if (_.isString(name)) {
      if (name === '*') {
        return null
      } else {
        names = [name]
      }
    } else if (_.isArray(name)) {
      names = name
    } else {
      throw new Error('bad param type')
    }
    names = _.filter(names, (name) => !_.isUndefined(model.fields[name]))
    var excludes = _.map(_.filter(names, (n) => n.startsWith('!')), (n) => n.substr(
      1))
    if (_.isEmpty(excludes)) {
      return _.uniq(names.concat(eager))
    } else {
      return _.difference(all, excludes)
    }
  } else {
    return eager
  }
}

function areFieldsRead (names) {
  return _.size(_.pick(this.readFields, names)) === names.length
}

function afterRead (names, result) {
  this.changes = {}
  this.attrs = {}
  this.readFields = names ? _.mapValues(result, () => true) : {
    '*': true
  }
  delete result.id
  this.set(result, {
    touch: false
  })
}

Record.prototype.isReading = function () {
  return utils.isPromise(this.readPromise)
}

Record.prototype.read = function (name) {
  dRec('%s(%s): read %s', this.model.name, this.id, name)
  assert(!this.isReading(), 'concurrent request')
  assert(this.id > 0, 'read non registered records')
  assert(!this.hasChanged(), 'read changed records')
  if (this.readFields['*']) {
    dRec('%s(%s): read (no server call)', this.model.name, this.id)
    return Promise.resolve()
  }
  var args = [
    [this.id]
  ]
  var names = parseReadParam(this.model, name)
  if (names && areFieldsRead.call(this, names)) {
    dRec('%s(%s): read (no server call)', this.model.name, this.id)
    return Promise.resolve()
  }
  if (names) {
    args.push(names)
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then(
      (results) => {
        var result = results[0]
        this.readPromise = true
        afterRead.call(this, names, result)
      }, (err) => {
        this.readPromise = false
        return Promise.reject(err)
      })
  this.readPromise = promise
  return promise
}

Record.prototype.isWriting = function () {
  return utils.isPromise(this.writePromise)
}

Record.prototype.write = function () {
  dRec('%s(%s): write', this.model.name, this.id)
  assert(!utils.isPromise(this.writePromise), 'concurrent request')
  assert(this.id > 0, 'write non registered records')
  assert(this.hasChanged(), 'no changes')
  var names = _.keys(this.changes)
  var args = [
    [this.id], _.zipObject(names, this.get(names, {
      rpc: true
    }))
  ]
  this.writePromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelWrite, args, this.getContext())
    .then(() => {
      resetAttrs.call(this)
      this.writePromise = true
    }, (err) => {
      this.writePromise = false
      return Promise.reject(err)
    })
  return this.writePromise
}

Record.prototype.create = function () {
  dRec('%s(%s): create', this.model.name, this.id)
  assert(!utils.isPromise(this.writePromise), 'concurrent request')
  assert(this.id < 0, 'create registered record')
  assert(this.hasChanged(), 'no changes')
  var names = _.keys(this.changes)
  var obj = _.zipObject(names, this.get(names, {
    rpc: true
  }))
  this.writePromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelCreate, [
        [obj]
      ], this.getContext())
    .then((ids) => {
      var old = this.id
      this.id = ids[0]
      resetAttrs.call(this)
      this.writePromise = true
      this.emit('mutate', old, this.id)
    }, (err) => {
      this.writePromise = false
      return Promise.reject(err)
    })
  return this.writePromise
}

Record.prototype.save = function () {
  dRec('%s(%s): save', this.model.name, this.id)
  if (this.id > 0) {
    return this.write()
  } else {
    return this.create()
  }
}

Record.prototype.setDefault = function (name, options) {
  dRec('%s(%s): setDefault', this.model.name, this.id)
  var names
  if (_.isNil(name)) {
    names = _.map(_.filter(this.model.fields, (field) => field.desc.loading ===
      'eager'), 'name')
  } else if (_.isString(name)) {
    names = [name]
  } else if (_.isArray(name)) {
    names = name
  } else {
    throw new Error('bad param type')
  }
  return this.session.rpc('model.' + this.model.name + '.' + methods.modelDefault, [
    names
  ], this.getContext())
    .then((result) => this.set(result, options))
}

Record.prototype._is_a_record = true

// Group class

function Group (session, model, origin, name) {
  if (this instanceof Group) {
    this.session = session
    this.model = model
    this.origin = origin
    this.name = name
    this.id = origin ? origin.id : _.uniqueId('+')
    dGrp('%s(%s): constructor', this.model.name, this.id)
    this.records = []
  } else {
    dGrp('%s: new', model)
    var modelName = model
    return Model.get(session, modelName)
      .then((model) => new Group(session, model, origin, name))
  }
}

inherits(Group, EventEmitter)
patch(Group, 'records')

Group.prototype.setContext = function (key, value) {
  dGrp('%s(%s): setContext', this.model.name, this.id)
  setContext.call(this, key, value)
}

Group.prototype.getContext = function () {
  var result = {}
  if (this.origin) {
    _.assign(result, this.origin.context || {})
  }
  _.assign(result, this.context)
  return result
}

Group.prototype.init = function (ids) {
  dGrp('%s(%s): init', this.model.name, this.id)
  this.records = _.map(ids, (id) => {
    var cached = this.session.cache.get(this.model.name, id)
    return cached || new Record(this.session, this.model, id,
      this)
  })
}

Group.prototype.reset = function () {
  dGrp('%s(%s): reset', this.model.name, this.id)
  this.each((rec) => rec.reset.apply(rec, arguments))
}

Group.prototype.get = function () {
  dGrp('%s(%s): get', this.model.name, this.id)
  return this.map((rec) => rec.get.apply(rec, arguments))
}

Group.prototype.set = function () {
  dGrp('%s(%s): set', this.model.name, this.id)
  return this.map((rec) => rec.set.apply(rec, arguments))
}

Group.prototype.toJSON = function (depth, level, parents) {
  return this.map((rec) => rec.toJSON(depth, level, parents))
}

Group.prototype.read = function (name) {
  dGrp('%s(%s): read %s', this.model.name, this.id, name)
  assert(this.every((rec) => !rec.isReading()), 'concurrent request')
  assert(this.every((rec) => rec.id > 0), 'read non registered records')
  assert(this.every((rec) => !rec.hasChanged()), 'read changed records')
  if (this.every((rec) => rec.readFields['*'] === true)) {
    dGrp('%s(%s): read (no server call)', this.model.name, this.id)
    return Promise.resolve()
  }
  var args = [
    this.map((rec) => rec.id)
  ]
  var names = parseReadParam(this.model, name)
  if (names && this.every((rec) => areFieldsRead.call(rec, names))) {
    dGrp('%s(%s): read (no server call)', this.model.name, this.id)
    return Promise.resolve()
  }
  if (names) {
    args.push(names)
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then((results) => this.each((rec) => {
      var result = _.find(results, (result) => result.id === rec.id)
      rec.readPromise = true
      afterRead.call(rec, names, result)
    }), (err) => {
      this.each((rec) => {
        rec.readPromise = false
      })
      return Promise.reject(err)
    })
  this.each((rec) => {
    rec.readPromise = promise
  })
  return promise
}

Group.prototype._is_a_group = true

Group.count = function (session, modelName, domain, context) {
  dGrp('%s: count', modelName)
  return session.rpc('model.' + modelName + '.' + methods.modelSearchCount, [
    domain || []
  ], context)
}

Group.search = function (session, modelName, criteria, context) {
  dGrp('%s: search', modelName)
  return session.rpc('model.' + modelName + '.' + methods.modelSearch, [
    criteria.domain || [], criteria.offset || null, criteria.limit ||
      null, criteria.order || null
  ], context)
    .then((ids) => Group(session, modelName)
      .then((group) => {
        group.setContext(context)
        group.init(ids)
        return group
      }))
}

Group.group = function (session, iterable) {
  var model = _.first(iterable)
    .model
  var modelName = model.name
  dGrp('%s: group', modelName)
  assert(!_.some(iterable, (rec) => !(rec instanceof Record) || rec.model.name !==
    modelName), 'bad argument')
  var group = new Group(session, model)
  group.records = _.map(iterable)
  return group
}

exports.init = require('./session')
exports.Model = Model
exports.Record = Record
exports.Group = Group

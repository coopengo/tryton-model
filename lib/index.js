var _ = require('lodash');
var assert = require('assert');
var inherits = require('inherits');
var EventEmitter = require('events');
var utils = require('./utils');
var Model = require('./model');
var methods = require('./methods');
var patch = require('./group-underscore');
var cache = require('./cache');
var dRec = require('debug')('tryton:model:record');
var dGrp = require('debug')('tryton:model:group');

function Empty() {}
var empty = new Empty();

function updateCache(oldId, newId) {
  cache.set(this.session, this.model.name, oldId, null);
  cache.set(this.session, this.model.name, newId, this);
}

function Record(session, model, id, group) {
  if (this instanceof Record) {
    dRec('%s: constructor', model.name);
    this.session = session;
    this.model = model;
    this.id = id || -parseInt(_.uniqueId());
    cache.set(this.session, this.model.name, this.id, this);
    this.on('mutate', updateCache);
    this.group = group;
    this.reset();
  }
  else {
    dRec('%s: new', model);
    var modelName = model;
    return Model.get(session, modelName)
      .then((model) => {
        // TODO: caching instances breaks Group belonging - origin - super)
        var cached = cache.get(session, model.name, id);
        return cached ? cached : new Record(session, model, id, group);
      });
  }
}
inherits(Record, EventEmitter);
Record.prototype.detach = function () {
  dRec('%s: detach', this.model.name);
  cache.set(this.session, this.model.name, this.id, null);
  this.removeListener('mutate', updateCache);
};

function resetAttrs() {
  this.attrs = {};
  this.changes = {};
  this.readFields = this.id > 0 ? {} : {
    '*': true
  };
}
Record.prototype.reset = function () {
  dRec('%s: reset', this.model.name);
  this.readPromise = false;
  this.writePromise = false;
  resetAttrs.call(this);
};
Record.prototype.changed = function () {
  return !_.isEmpty(this.changes);
};

function setContext(key, value) {
  if (_.isNil(key)) {
    this.context = null;
  }
  else {
    if (!this.context) {
      this.context = {};
    }
    if (_.isString(key)) {
      this.context[key] = value;
    }
    else if (_.isPlainObject(key)) {
      _.assign(this.context, key);
    }
  }
}
Record.prototype.setContext = function (key, value) {
  dRec('%s: setContext', this.model.name);
  setContext.call(this, key, value);
};
Record.prototype.getContext = function () {
  dRec('%s: getContext', this.model.name);
  var result = {};
  if (this.group) {
    _.assign(result, this.group.getContext());
  }
  _.assign(result, this.context);
  return result;
};

function instFromId(record, field, value) {
  if (field.cls === 'record') {
    assert(_.isNumber(value), 'only ids');
    return Record(record.session, field.desc.relation, value);
  }
  else if (field.cls === 'group') {
    assert(_.isArray(value) && _.every(value, _.isNumber), 'only ids');
    return Group(record.session, field.desc.relation, record, field.name)
      .then((group) => {
        group.init(value);
        return group;
      });
  }
  else {
    throw new Error('bad type value');
  }
}
Record.prototype.get = function (name, options) {
  dRec('%s: get', this.model.name);
  var obj;
  if (_.isUndefined(name)) {
    obj = true;
    options = {};
  }
  else if (_.isPlainObject(name)) {
    obj = true;
    options = name;
  }
  else {
    options = options || {};
  }
  var names;
  if (obj) {
    names = _.keys(this.attrs);
  }
  else {
    if (_.isString(name)) {
      names = [name];
    }
    else if (_.isArray(name)) {
      names = name;
    }
    else {
      throw new Error('calling get with strange attributes');
    }
    var notField = _.filter(names, (name) => _.isUndefined(this.model.fields[
      name]));
    assert(_.isEmpty(notField), 'getting bad fields: ' + notField);
    if (!this.readFields['*']) {
      var notRead = _.filter(names, (name) => this.readFields[name] !== true);
      assert(_.isEmpty(notRead), 'getting unread fields: ' + notRead);
    }
  }
  assert(!_.includes(names, 'id'), 'can not get id');
  var notOption = _.omit(options, ['rpc', 'oc', 'inst', 'parent']);
  assert(_.isEmpty(notOption), 'bad options: ' + notOption);
  _.defaults(options, {
    rpc: false,
    oc: false,
    inst: true,
    'parent': false
  });
  var l = _.map(names, (name) => ({
    name: name,
    field: this.model.fields[name],
    value: this.model.fields[name].get(this.attrs[name], options)
  }));
  var id = this.id;

  function wrap() {
    if (_.isString(name)) {
      return l[0].value;
    }
    else if (obj) {
      var res = _.zipObject(names, _.map(l, 'value'));
      res.id = id;
      return res;
    }
    else {
      return _.map(l, 'value');
    }
  }
  if (options.inst === true) {
    var toInst = _.filter(l, (e) => e.field.cls && e.value);
    return Promise.all(_.map(toInst, (e) => instFromId(this, e.field, e.value)))
      .then((instances) => {
        _.each(toInst, (e, index) => {
          e.value = instances[index];
        });
        return wrap();
      });
  }
  else {
    var res = wrap();
    if (obj && options.parent) {
      if (this.group && this.group.origin) {
        res._parent_ = this.group.origin.get(options);
      }
    }
    return res;
  }
};

function deflat(obj) {
  var res = {};
  _.each(_.keys(obj), (k) => {
    var i = k.indexOf('.');
    if (i >= 0) {
      var key = k.substr(0, i);
      var sub = k.substr(i + 1);
      if (!res[key]) {
        res[key] = {};
      }
      res[key][sub] = obj[k];
      delete obj[k];
    }
  });
  if (_.isEmpty(res)) {
    return obj;
  }
  else {
    _.each(_.keys(obj), (k) => {
      if (res[k]) {
        res[k].id = obj[k];
        delete obj[k];
      }
    });
    res = _.mapValues(res, (v) => {
      return deflat(v);
    });
    return _.assign(obj, res);
  }
}
Record.prototype.set = function (name, value, options) {
  dRec('%s: set', this.model.name);
  var values;
  if (_.isPlainObject(name)) {
    values = name;
    options = value;
  }
  else {
    values = {};
    values[name] = value;
  }
  options = options || {};
  assert(_.isUndefined(values.id), 'can not set id');
  var notOption = _.omit(options, ['event', 'sync', 'touch', 'oc']);
  assert(_.isEmpty(notOption), 'bad options: ' + notOption);
  _.defaults(options, {
    event: true,
    sync: false,
    touch: true,
    oc: false,
  });
  var changes = {};
  values = deflat(values);
  var notField = _.keys(_.pickBy(values, (v, k) => _.isUndefined(this.model.fields[
    k])));
  assert(_.isEmpty(notField), 'setting bad fields: ' + notField);
  if (!this.readFields['*']) {
    var notRead = _.keys(_.pickBy(values, (v, k) => this.readFields[k] !==
      true));
    assert(_.isEmpty(notRead), 'setting unread fields: ' + notRead);
  }
  var l = _.map(values, (v, k) => ({
    name: k,
    field: this.model.fields[k],
    value: this.model.fields[k].set(v, _.assign({
      old: this.attrs[k]
    }, options))
  }));
  _.each(l, (e) => {
    var newVal = e.value;
    var oldVal = this.attrs[e.name] || null;
    // TODO: compare objects (array, reference)
    if (!_.isEqual(oldVal, newVal)) {
      changes[e.name] = _.isUndefined(oldVal) ? empty : oldVal;
      this.attrs[e.name] = newVal;
    }
  });
  if (!_.isEmpty(changes)) {
    if (options.touch) {
      _.assign(this.changes, changes);
    }
    if (options.event) {
      this.emit('change');
      _.each(changes, (v, k) => {
        this.emit('change:' + k, this.attrs[k], v);
      });
    }
  }
  if (options.sync && !_.isEmpty(changes)) {
    var fieldNames = _.keys(changes);
    return this.onChange(fieldNames)
      .then(() => this.onChangeWith(fieldNames));
  }
  else {
    return Promise.resolve(this);
  }
};

function flatten(obj, paths) {
  var values = _.map(paths, (path) => _.reduce(path.split('.'), (value, sub) => {
    if (value) {
      return value[sub];
    }
    else {
      return value;
    }
  }, obj));
  return _.zipObject(paths, values);
}
Record.prototype.onChange = function (names) {
  dRec('%s: onChange %s', this.model.name, names.join(','));
  var paths = _.uniq(_.flatten(_.map(names, (name) => this.model.fields[name]
    .desc.on_change || [])));
  if (!_.isEmpty(paths)) {
    var values = flatten(this.get({
      oc: true,
      inst: false,
      'parent': true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChange, [
        values, names
      ], this.getContext())
      .then((results) => Promise.all(_.map(results, (result) => this.set(
          result, {
            touch: true,
            event: true,
            sync: false,
            oc: true,
          })))
        .then(() => this));
  }
  else {
    return Promise.resolve(this);
  }
};
Record.prototype.onChangeWith = function (names) {
  dRec('%s: onChangeWith %s', this.model.name, names.join(','));
  var fieldNames = [];
  var postponed = [];
  var paths = [];
  _.each(this.model.fields, (v, k) => {
    var ocw = v.desc.on_change_with || [];
    if (!_.isEmpty(_.intersection(ocw, names))) {
      if (!_.isEmpty(_.intersection(ocw, fieldNames))) {
        postponed.push(k);
      }
      else {
        fieldNames.push(k);
        paths = _.union(paths, ocw);
      }
    }
  });
  if (!_.isEmpty(fieldNames)) {
    var values = flatten(this.get({
      oc: true,
      inst: false,
      'parent': true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith, [
        values, fieldNames
      ], this.getContext())
      .then((result) => this.set(result, {
          touch: true,
          event: true,
          sync: false,
          oc: true,
        })
        .then(() => Promise.all(_.map(postponed, (fieldName) => {
            var values = flatten(this.get({
              rpc: true,
              inst: false,
              'parent': true
            }), this.model.fields[fieldName].desc.on_change_with);
            return this.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith +
                '_' + fieldName, [values], this.getContext())
              .then((result) => this.set(result, {
                touch: true,
                event: true,
                sync: false,
                oc: true,
              }));
          }))
          .then(() => this)));
  }
  else {
    return Promise.resolve(this);
  }
};
Record.prototype.toJSON = function (depth, level, parents) {
  dRec('%s: toJSON', this.model.name);
  depth = depth || 1;
  level = level || 0;
  parents = parents || {};
  var key = this.model.name + '-' + this.id;
  if (parents[key]) {
    return {
      _: this.model.name,
      id: this.id
    };
  }
  parents = _.clone(parents);
  parents[key] = true;
  var l = _.mapValues(this.attrs, (v, k) => ({
    name: k,
    field: this.model.fields[k],
    value: this.model.fields[k].get(v, {})
  }));
  var records = _.filter(l, (e) => e.field.cls === 'record');
  _.each(records, (e) => {
    var done = false;
    if (level < depth) {
      var cached = cache.get(this.session, e.field.desc.relation, e.value);
      if (cached) {
        done = true;
        e.value = cached.toJSON(depth, level + 1, parents);
      }
    }
    if (!done) {
      e.value = {
        _: e.field.desc.relation,
        id: e.value
      };
    }
  });
  var groups = _.filter(l, (e) => e.field.cls === 'group');
  _.each(groups, (e) => {
    var done = false;
    if (level < depth) {
      var model = Model.get(this.session, e.field.desc.relation, true);
      if (model) {
        done = true;
        var group = new Group(this.session, model, this, e.field.name);
        group.init(e.value);
        e.value = group.toJSON(depth, level + 1, parents);
      }
    }
    if (!done) {
      e.value = _.map(e.value, (v) => ({
        _: e.field.desc.relation,
        id: v
      }));
    }
  });
  return _.assign({
    _: this.model.name,
    id: this.id
  }, _.zipObject(_.map(l, 'name'), _.map(l, 'value')));
};

function parseReadParam(model, name) {
  var all = _.keys(model.fields);
  var eager = _.map(_.filter(model.fields, (field) => field.desc.loading ===
    'eager'), 'name');
  if (name) {
    var names;
    if (_.isString(name)) {
      if (name === '*') {
        return null;
      }
      else {
        names = [name];
      }
    }
    else if (_.isArray(name)) {
      names = name;
    }
    else {
      throw new Error('bad read param');
    }
    var excludes = _.map(_.filter(names, (n) => n.startsWith('!')), (n) => n.substr(
      1));
    if (_.isEmpty(excludes)) {
      return _.uniq(names.concat(eager));
    }
    else {
      return _.difference(all, excludes);
    }
  }
  else {
    return eager;
  }
}

function afterRead(names, result) {
  this.changes = {};
  this.attrs = {};
  this.readFields = names ? _.mapValues(result, () => true) : {
    '*': true
  };
  delete result.id;
  return this.set(result, {
      touch: false,
      event: true,
      sync: false,
    })
    .then(() => {
      this.readPromise = true;
    });
}
Record.prototype.read = function (name) {
  dRec('%s: read', this.model.name);
  assert(this.id > 0, 'can not read non registered records');
  assert(!this.changed(), 'can not read changed records');
  if (utils.isPromise(this.readPromise)) {
    return this.readPromise;
  }
  var args = [
    [this.id]
  ];
  var names = parseReadParam(this.model, name);
  if (names) {
    args.push(names);
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then(
      (results) => {
        var result = results[0];
        return afterRead.call(this, names, result);
      }, (err) => {
        this.readPromise = false;
        return Promise.reject(err);
      });
  this.readPromise = promise;
  return promise;
};
Record.prototype.write = function () {
  dRec('%s: write', this.model.name);
  assert(this.id > 0, 'can not write non registered records');
  assert(!utils.isPromise(this.writePromise), 'concurrent request');
  var names = _.keys(this.changes);
  var args = [
    [this.id], _.zipObject(names, this.get(names, {
      rpc: true,
      inst: false
    }))
  ];
  this.writePromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelWrite, args, this.getContext())
    .then(() => {
      resetAttrs.call(this);
      this.writePromise = true;
    }, (err) => {
      this.writePromise = false;
      return Promise.reject(err);
    });
  return this.writePromise;
};
Record.prototype.create = function () {
  dRec('%s: create', this.model.name);
  assert(!utils.isPromise(this.writePromise), 'concurrent request');
  assert(this.id < 0, 'can only create non registered record');
  var names = _.keys(this.changes);
  var obj = _.zipObject(names, this.get(names, {
    rpc: true,
    inst: false
  }));
  this.writePromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelCreate, [
        [obj]
      ], this.getContext())
    .then((ids) => {
      var old = this.id;
      this.id = ids[0];
      resetAttrs.call(this);
      this.writePromise = true;
      this.emit('mutate', old, this.id);
    }, (err) => {
      this.writePromise = false;
      return Promise.reject(err);
    });
  return this.writePromise;
};
Record.prototype.save = function () {
  dRec('%s: save', this.model.name);
  if (!_.isEmpty(this.changes)) {
    if (this.id > 0) {
      return this.write();
    }
    else {
      return this.create();
    }
  }
  else {
    return Promise.resolve('no changes');
  }
};
Record.prototype.setDefault = function (name) {
  dRec('%s: setDefault', this.model.name);
  var names;
  if (_.isUndefined(name)) {
    names = _.keys(this.model.fields);
  }
  else if (_.isString(name)) {
    names = [name];
  }
  else {
    names = name;
  }
  return this.session.rpc('model.' + this.model.name + '.' + methods.modelDefault, [
      names
    ], this.getContext())
    .then((result) => this.set(result));
};
//
// Group class
//
function Group(session, model, origin, name) {
  if (this instanceof Group) {
    dGrp('%s: constructor', model.name);
    this.session = session;
    this.model = model;
    this.origin = origin;
    this.name = name;
    this.records = [];
  }
  else {
    dGrp('%s: new', model);
    var modelName = model;
    return Model.get(session, modelName)
      .then((model) => new Group(session, model, origin, name));
  }
}
inherits(Group, EventEmitter);
patch(Group, 'records');
Group.prototype.setContext = function (key, value) {
  dGrp('%s: setContext', this.model.name);
  setContext.call(this, key, value);
};
Group.prototype.getContext = function () {
  dGrp('%s: getContext', this.model.name);
  var result = {};
  if (this.origin) {
    _.assign(result, this.origin.context || {});
  }
  _.assign(result, this.context);
  return result;
};
Group.prototype.init = function (ids) {
  dGrp('%s: init', this.model.name);
  this.records = _.map(ids, (id) => {
    // TODO: caching instances breaks Group belonging - origin - super)
    var cached = cache.get(this.session, this.model.name, id);
    return cached ? cached : new Record(this.session, this.model, id,
      this);
  });
};
Group.prototype.get = function () {
  dGrp('%s: set', this.model.name);
  return this.map((rec) => rec.get.apply(rec, arguments));
};
Group.prototype.set = function () {
  dGrp('%s: set', this.model.name);
  return this.map((rec) => rec.set.apply(rec, arguments));
};
Group.prototype.toJSON = function (depth, level, parents) {
  dGrp('%s: toJSON', this.model.name);
  depth = depth || 2;
  level = level = level || 0;
  parents = parents || {};
  return this.map((rec) => rec.toJSON(depth, level, parents));
};
Group.prototype.read = function (name) {
  dGrp('%s: read', this.model.name);
  assert(this.every((rec) => rec.id > 0),
    'can not read non registered records');
  assert(this.every((rec) => !rec.changed()), 'can not read changed record');
  var started = this.filter((rec) => utils.isPromise(rec.readPromise));
  var starting = this.filter((rec) => !utils.isPromise(rec.readPromise));
  var args = [
    _.map(starting, 'id')
  ];
  var names = parseReadParam(this.model, name);
  if (names) {
    args.push(names);
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then(results => Promise.all(_.map(results, (result) => {
      var rec = _.find(starting, {
        id: result.id
      });
      return afterRead.call(rec, names, result);
    })), (err) => {
      _.each(starting, (rec) => {
        rec.readPromise = false;
      });
      return Promise.reject(err);
    });
  _.each(starting, (rec) => {
    rec.readPromise = promise;
  });
  var promises = _.map(started, 'readPromise');
  promises.push(promise);
  return Promise.all(promises);
};
Group.search = function (session, modelName, desc, context) {
  dGrp('%s: search', modelName);
  return session.rpc('model.' + modelName + '.' + methods.modelSearch, [
      desc.domain || [], desc.offset || null, desc.limit || null, desc.order ||
      null
    ], context)
    .then((ids) => Group(session, modelName)
      .then((group) => {
        group.setContext(context);
        group.init(ids);
        return group;
      }));
};
Group.group = function (session, iterable) {
  var model = _.first(iterable)
    .model;
  var modelName = model.name;
  dGrp('%s: group', modelName);
  assert(!_.some(iterable, (rec) => !(rec instanceof Record) || rec.model.name !==
    modelName), 'bad argument');
  var group = new Group(session, model);
  group.records = _.map(iterable);
  return group;
};
//
// exports
exports.init = require('./session');
exports.Model = Model;
exports.Record = Record;
exports.Group = Group;

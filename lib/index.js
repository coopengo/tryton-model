var _ = require('lodash');
var assert = require('assert');
var inherits = require('inherits');
var EventEmitter = require('events');
var utils = require('./utils');
var Model = require('./model');
var methods = require('./methods');
var patch = require('./group-underscore');
var cache = require('./cache');
var dRec = require('debug')('api:model:record');
var dGrp = require('debug')('api:model:group');
//
// Utils
//
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

function instanciate(record, field, value) {
  if (field.cls === 'record') {
    return Record(record.session, field.desc.relation, value);
  }
  else if (field.cls === 'group') {
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
//
// Record class
//
function Empty() {}
var empty = new Empty();

function onCreate(oldId, newId) {
  cache.set(this.session, this.model.name, oldId, null);
  cache.set(this.session, this.model.name, newId, this);
}

function parseReadParam(model, name) {
  var names;
  if (_.isString(name)) {
    names = [name];
  }
  else if (_.isArray(name)) {
    names = name;
  }
  else {
    return;
  }
  if (names[0][0] === '!') {
    names = _.map(names, (name) => name.substr(1));
    names = _.keys(_.omit(model.fields, names));
  }
  return names;
}

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

function Record(session, model, id, group) {
  if (this instanceof Record) {
    dRec(model.name + ': constructor');
    this.session = session;
    this.model = model;
    this.id = id || -parseInt(_.uniqueId());
    cache.set(this.session, this.model.name, this.id, this);
    this.on('create', onCreate);
    this.group = group;
    this.attrs = {};
    this.changes = {};
    this.readPromise = false;
    this.readFields = {};
    this.writePromise = null;
    this.createPromise = null;
  }
  else {
    dRec(model + ': new');
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
  cache.set(this.session, this.model.name, this.id, null);
  this.removeListener('remove', onCreate);
};
Record.prototype.changed = function () {
  return !_.isEmpty(this.changes);
};
Record.prototype.setContext = function (key, value) {
  dRec(this.model.name + ': setContext');
  setContext.call(this, key, value);
};
Record.prototype.getContext = function () {
  dRec(this.model.name + ': getContext');
  var result = {};
  if (this.group) {
    _.assign(result, this.group.getContext());
  }
  _.assign(result, this.context);
  return result;
};
Record.prototype.loadModel = function () {
  dRec(this.model.name + ': loadModel');
  Model(this.session, this.model.name, this.getContext())
    .then((model) => {
      this.model = model;
    });
};
Record.prototype.get = function (name, options) {
  dRec(this.model.name + ': get', name, options);
  var names;
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
    assert(this.id < 0 || _.every(names, (name) => this.readFields[name] ===
      true), 'get unread fields');
  }
  assert(_.isEmpty(_.omit(options, ['rpc', 'instanciate', 'parent'])),
    'unknown options');
  _.defaults(options, {
    rpc: false,
    instanciate: true,
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
  if (options.instanciate === true) {
    var toInst = _.filter(l, (e) => e.field.cls && e.value);
    return Promise.all(_.map(toInst, (e) => instanciate(this, e.field, e.value)))
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
Record.prototype.set = function (name, value, options) {
  dRec(this.model.name + ': set');
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
  assert(_.isEmpty(_.omit(options, ['emit', 'sync', 'touch'])),
    'unknown options');
  _.defaults(options, {
    emit: true,
    sync: true,
    touch: true,
  });
  var changes = {};
  var l = _.map(deflat(values), (v, k) => ({
    name: k,
    field: this.model.fields[k],
    value: this.model.fields[k].set(v, options)
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
    if (options.emit) {
      this.emit('change');
      _.each(changes, (v, k) => {
        this.emit('change:' + k, this.attrs[k], v);
      });
    }
  }
  if (options.sync) {
    if (!_.isEmpty(changes)) {
      var fieldNames = _.keys(changes);
      return this.onChange(fieldNames)
        .then(() => this.onChangeWith(fieldNames));
    }
    else {
      return Promise.resolve();
    }
  }
};
Record.prototype.onChange = function (names) {
  dRec(this.model.name + ': onChange', names);
  var paths = _.uniq(_.flatten(_.map(names, (name) => this.model.fields[name]
    .desc.on_change || [])));
  if (!_.isEmpty(paths)) {
    var values = flatten(this.get({
      rpc: true,
      instanciate: false,
      'parent': true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChange, [
        values, names
      ], this.getContext())
      .then((results) => {
        _.map(results, (result) => this.set(result, {
          touch: true,
          emit: true,
          sync: false,
        }));
      });
  }
  else {
    return Promise.resolve();
  }
};
Record.prototype.onChangeWith = function (names) {
  dRec(this.model.name + ': onChangeWith', names);
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
      rpc: true,
      instanciate: false,
      'parent': true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith, [
        values, fieldNames
      ], this.getContext())
      .then((result) => {
        this.set(result, {
          touch: true,
          emit: true,
          sync: false,
        });
        return Promise.all(_.map(postponed, (fieldName) => {
          var values = flatten(this.get({
            rpc: true,
            instanciate: false,
            'parent': true
          }), this.model.fields[fieldName].desc.on_change_with);
          return this.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith +
              '_' + fieldName, [values], this.getContext())
            .then((result) => this.set(result, {
              touch: true,
              emit: true,
              sync: false,
            }));
        }));
      });
  }
  else {
    return Promise.resolve();
  }
};
Record.prototype.toJSON = function (depth, level, parents) {
  dRec(this.model.name + ': toJSON');
  depth = depth || 2;
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
Record.prototype.read = function (name) {
  dRec(this.model.name + ': read', name);
  assert(this.id > 0, 'can not read non registered records');
  if (!name) {
    if (this.readPromise === true) {
      return Promise.resolve(true);
    }
    else if (utils.isPromise(this.readPromise)) {
      return this.readPromise;
    }
  }
  var names = parseReadParam(this.model, name);
  var args = [
    [this.id]
  ];
  if (names) {
    args.push(names);
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then(
      (results) => {
        var result = results[0];
        _.assign(this.readFields, _.mapValues(result, () => true));
        this.set(result, {
          touch: false,
          emit: true,
          sync: false,
        });
        if (!name) {
          this.readPromise = true;
        }
      });
  if (!name) {
    this.readPromise = promise;
  }
  return promise;
};
Record.prototype.write = function (name) {
  dRec(this.model.name + ': write');
  assert(this.id > 0, 'can not write non registered records');
  assert(!utils.isPromise(this.writePromise), 'concurrent request');
  var names;
  if (_.isString(name)) {
    names = [name];
  }
  else if (_.isArray(name)) {
    names = name;
  }
  if (!names) {
    names = _.keys(this.changes);
  }
  var args = [
    [this.id], _.zipObject(names, this.get(names, {
      rpc: true,
      instanciate: false
    }))
  ];
  this.writePromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelWrite, args, this.getContext())
    .then(() => {
      this.changes = _.omit(this.changes, names);
      this.emit('write');
      this.writePromise = null;
    });
  return this.writePromise;
};
Record.prototype.create = function () {
  dRec(this.model.name + ': create');
  assert(this.id < 0, 'can only create non registered record');
  assert(!utils.isPromise(this.createPromise), 'concurrent request');
  var required = _.map(_.filter(_.toPairs(this.model.fields), (pair) => pair[
    1].desc.required), (pair) => pair[0]);
  var names = _.keys(this.changes);
  var obj = _.zipObject(names, this.get(names, {
    rpc: true,
    instanciate: false
  }));
  var missing = _.filter(required, (fname) => _.isUndefined(obj[fname]));
  assert(_.isEmpty(missing), 'required attrs: ' + missing);
  this.createPromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelCreate, [
        [obj]
      ], this.getContext())
    .then((ids) => {
      this.changes = _.omit(this.changes, names);
      var old = this.id;
      this.id = ids[0];
      this.emit('create', old, this.id);
      this.createPromise = null;
    });
  return this.createPromise;
};
Record.prototype.save = function () {
  dRec(this.model.name + ': save');
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
  dRec(this.model.name + ': setDefault');
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
    dGrp(model.name + ': constructor');
    this.session = session;
    this.model = model;
    this.origin = origin;
    this.name = name;
    this.records = [];
    this.removed = [];
    this.deleted = [];
  }
  else {
    dGrp(model + ': new');
    var modelName = model;
    return Model.get(session, modelName)
      .then((model) => {
        return new Group(session, model, origin, name);
      });
  }
}
inherits(Group, EventEmitter);
patch(Group, 'records');
Group.prototype.setContext = function (key, value) {
  dGrp(this.model.name + ': setContext');
  setContext.call(this, key, value);
};
Group.prototype.getContext = function () {
  dGrp(this.model.name + ': getContext');
  var result = {};
  if (this.origin) {
    _.assign(result, this.origin.context || {});
  }
  _.assign(result, this.context);
  return result;
};
Group.prototype.init = function (ids) {
  dGrp(this.model.name + ': init');
  this.records = _.map(ids, (id) => {
    // TODO: caching instances breaks Group belonging - origin - super)
    var cached = cache.get(this.session, this.model.name, id);
    return cached ? cached : new Record(this.session, this.model, id,
      this);
  });
};
Group.prototype.set = function () {
  dGrp(this.model.name + ': set');
  return Promise.all(this.map((rec) => rec.set.apply(rec, arguments)));
};
Group.prototype.toJSON = function (depth, level, parents) {
  dGrp(this.model.name + ': toJSON');
  depth = depth || 2;
  level = level = level || 0;
  parents = parents || {};
  return this.map((rec) => {
    return rec.toJSON(depth, level, parents);
  });
};
Group.prototype.read = function (name) {
  dGrp(this.model.name + ': read', name);
  assert(!this.some((rec) => rec.id < 0),
    'can not read non registered records');
  var started, starting;
  if (!name) {
    started = this.filter((rec) => utils.isPromise(rec.readPromise));
    starting = this.filter((rec) => !utils.isPromise(rec.readPromise));
  }
  else {
    started = [];
    starting = this.records;
  }
  var names = parseReadParam(this.model, name);
  var args = [
    _.map(starting, (rec) => rec.id)
  ];
  if (names) {
    args.push(names);
  }
  var promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelRead,
      args, this.getContext())
    .then(
      (results) => {
        _.each(starting, (rec, i) => {
          var result = results[i];
          _.assign(rec.readFields, _.mapValues(result, () => true));
          rec.set(result, {
            touch: false,
            emit: true,
            sync: false,
          });
          if (!name) {
            rec.readPromise = true;
          }
        });
      });
  if (!name) {
    _.each(starting, (rec) => {
      rec.readPromise = promise;
    });
  }
  var promises = _.map(started, (rec) => rec.readPromise);
  promises.push(promise);
  return Promise.all(promises);
};
Group.search = function (session, modelName, desc, context) {
  dGrp(modelName + ': search');
  return session.rpc('model.' + modelName + '.' + methods.modelSearch, [
      desc.domain || [], desc.offset || null, desc.limit || null, desc.order ||
      null
    ], context)
    .then((ids) => {
      return Group(session, modelName)
        .then((group) => {
          group.setContext(context);
          group.init(ids);
          return group;
        });
    });
};
Group.group = function (session, iterable) {
  var model = iterable[0].model;
  var modelName = model.name;
  dGrp(modelName + ': group');
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

var _ = require('underscore');
var EventEmitter = require('events');
var debug = require('debug')('api:model:record');
var methods = require('./methods');
var Model = require('./model');

function Empty() {}
var empty = new Empty();

function flatten(obj, paths) {
  var values = _.map(paths, (path) => _.reduce(path.split('.'), (value, sub) => {
    if (value) {
      return value[sub];
    }
    else {
      return value;
    }
  }, obj));
  return _.object(paths, values);
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
    res = _.mapObject(res, (v) => {
      return deflat(v);
    });
    return _.extendOwn(obj, res);
  }
}

function Record(session, model, id, group) {
  if (this instanceof Record) {
    debug(model.name + ': constructor');
    this.session = session;
    this.session.on('stop', () => {
      this.emit('destroy');
    });
    this.model = model;
    this.id = id || -parseInt(_.uniqueId());
    this.group = group;
    this.attrs = {};
    this.changes = {};
    this.timestamp = null;
    this.readPromise = null;
    this.readFields = {};
  }
  else {
    debug(model + ': new');
    var modelName = model;
    return Model.get(session, modelName)
      .then((model) => new Record(session, model, id, group));
  }
}
_.inherit(Record, EventEmitter);
//
// context accessors
Record.prototype.setContext = function (context) {
  debug(this.model.name + ': setContext');
  if (!(_.isUndefined(context) || context === null)) {
    this.context = context;
  }
};
Record.prototype.getContext = function () {
  debug(this.model.name + ': getContext');
  var result = {};
  if (this.context) {
    _.extendOwn(result, this.context);
  }
  if (this.group) {
    _.extendOwn(result, this.group.getContext());
  }
  return result;
};
Record.prototype.getFieldContext = function (fieldName) {
  // TODO
};
//
// model per record (for specific context)
Record.prototype.loadModel = function () {
  debug(this.model.name + ': loadModel');
  Model(this.session, this.model.name, this.getContext())
    .then((model) => {
      this.model = model;
    });
};
//
// attributes
Record.prototype.getTimestamp = function () {
  debug(this.model.name + ': getTimestamp');
  var res = {
    [this.model.name + ',' + this.id]: this.timestamp
  };
  _.each(this.readFields, (v, fieldName) => {
    _.extendOwn(res, this.model.fields[fieldName].getTimestamp(this.attrs[
      fieldName]));
  });
};
Record.prototype.get = function (name, options) {
  var names;
  var obj;
  if (_.isUndefined(name)) {
    obj = true;
    options = {};
  }
  else if (_.isObject(name) && !_.isArray(name)) {
    obj = true;
    options = name;
    if (options.on_change || options.eval || options.save) {
      options.immediate = true;
    }
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
  }
  debug(this.model.name + ': get ' + names);
  _.assert(this.id < 0 || _.every(names, (name) => this.readFields[name] ===
    true), 'get unread fields');
  var context = this.getContext();
  var pairs = _.map(names, (name) => [name, this.model.fields[name]]);
  var self = this;

  function doPair(pair) {
    return pair[1].get(self.attrs[pair[0]], options, context);
  }
  var res;
  if (obj) {
    if (options.immediate) {
      res = _.object(names, _.map(pairs, doPair));
    }
    else {
      res = Promise.all(_.map(pairs, doPair))
        .then((values) => _.object(names, values));
    }
  }
  else if (_.size(pairs) == 1) {
    res = doPair(pairs[0]);
  }
  else {
    if (options.immediate) {
      res = _.map(pairs, doPair);
    }
    else {
      res = Promise.all(_.map(pairs, doPair));
    }
  }
  if (options.on_change) {
    res.id = this.id;
    if (this.group && this.group.origin) {
      res._parent_ = this.group.origin.get(options);
    }
  }
  return res;
};
Record.prototype.set = function (name, value, options) {
  var values;
  if (_.isObject(name) && !_.isArray(name)) {
    values = name;
    options = value;
  }
  else {
    values = {};
    values[name] = value;
  }
  options = options || {};
  debug(this.model.name + ': set ' + _.keys(values));
  if (options.on_change) {
    options = _.extendOwn({
      touch: true,
      emit: true,
      sync: false,
    }, options);
  }
  else if (options.default_get) {
    options = _.extendOwn({
      touch: true,
      emit: true,
      sync: true,
    }, options);
  }
  else if (options.read) {
    options = _.extendOwn({
      touch: false,
      emit: true,
      sync: false,
    }, options);
  }
  else {
    options = _.extendOwn({
      touch: true,
      emit: true,
      sync: true,
    }, options);
  }
  var context = this.getContext();
  var changes = {};
  var pairs = _.pairs(deflat(values));
  // call field:set on all fields (transform input)
  var promise = Promise.all(_.map(pairs, (pair) => {
    return this.model.fields[pair[0]].set(this.attrs[pair[0]], pair[1],
      options, context);
  }));
  // set values and update changes
  promise = promise.then((result) => {
    pairs.forEach((pair, i) => {
      var newVal = result[i];
      var oldVal = this.attrs[pair[0]];
      if (!_.isEqual(oldVal, newVal)) {
        changes[pair[0]] = _.isUndefined(oldVal) ? empty : oldVal;
        this.attrs[pair[0]] = newVal;
      }
    });
    if (!_.isEmpty(changes)) {
      if (options.touch) {
        _.extendOwn(this.changes, changes);
      }
      if (options.emit) {
        this.emit('change');
        _.forEach(changes, (v, k) => {
          this.emit('change:' + k, this.attrs[k], v);
        });
      }
    }
  });
  // hit server events
  if (options.sync) {
    promise = promise.then(() => {
        if (!_.isEmpty(changes)) {
          var fieldNames = _.keys(changes);
          return this.onChange(fieldNames);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(() => {
        if (!_.isEmpty(changes)) {
          var fieldNames = _.keys(changes);
          return this.onChangeWith(fieldNames);
        }
        else {
          return Promise.resolve();
        }
      });
  }
  return promise;
};
//
// server triggers (on change)
Record.prototype.onChange = function (names) {
  debug(this.model.name + ': onChange ' + names);
  var paths = _.unique(_.flatten(_.map(names, (name) => this.model.fields[
    name].desc.on_change || [])));
  if (!_.isEmpty(paths)) {
    var values = flatten(this.get({
      on_change: true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChange, [
        values, names
      ], this.getContext())
      .then((results) => Promise.all(_.map(results, (result) => this.set(
        result, {
          on_change: true
        }))));
  }
  else {
    return Promise.resolve();
  }
};
Record.prototype.onChangeWith = function (names) {
  debug(this.model.name + ': onChangeWith ' + names);
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
      on_change: true
    }), paths);
    return this.session.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith, [
        values, fieldNames
      ], this.getContext())
      .then((result) => this.set(result, {
        on_change: true
      }))
      .then(() => Promise.all(_.map(postponed, (fieldName) => {
        var values = flatten(this.get({
          on_change: true
        }), this.model.fields[fieldName].desc.on_change_with);
        return this.rpc('model.' + this.model.name + '.' + methods.modelOnChangeWith +
            '_' + fieldName, [values], this.getContext())
          .then((result) => this.set(result, {
            on_change: true
          }));
      })));
  }
  else {
    return Promise.resolve();
  }
};
//
// server actions
Record.prototype.read = function (name) {
  _.assert(this.id > 0, 'object is not saved');
  _.assert(!this.readPromise, 'another read request is running');
  debug(this.model.name + ': read ' + names);
  var args = [
    [this.id]
  ];
  var names;
  if (_.isString(name)) {
    names = [name];
  }
  else if (_.isArray(name)) {
    names = name;
  }
  if (names) {
    args.push(names);
  }
  this.readPromise = this.session.rpc('model.' + this.model.name + '.' +
      methods.modelRead, args, this.getContext())
    .then(
      (result) => {
        result = result[0];
        _.extendOwn(this.readFields, _.mapObject(result, () => true));
        return this.set(result, {
          read: true
        });
      })
    .then(() => {
      this.readPromise = null;
    }, () => {
      this.readPromise = null;
    });
  return this.readPromise;
};
Record.prototype.save = function () {
  debug(this.model.name + ': save');
  if (!_.isEmpty(this.changes)) {
    var promise;
    if (this.id > 0) {
      promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelWrite, [
        [this.id], this.get(_.keys(this.changes), {
          save: true
        })
      ], _.extendOwn({}, this.getContext() || this.session.context, {
        _timestamp: this.getTimestamp()
      }));
    }
    else {
      var required = _.map(_.filter(_.pairs(this.model.fields), (pair) =>
        pair[1].desc.required), (pair) => pair[0]);
      var attrs = this.get({
        save: true
      });
      var missing = _.filter(required, (fieldName) => _.isUndefined(attrs[
        fieldName]));
      _.assert(_.isEmpty(missing), 'required attrs: ' + missing);
      promise = this.session.rpc('model.' + this.model.name + '.' + methods.modelCreate, [
          [attrs]
        ], this.getContext())
        .then((ids) => {
          this.id = ids[0];
          this.emit('change:id');
        });
    }
    return promise.then(() => {
      this.changes = {};
    });
  }
  else {
    return Promise.resolve('no changes');
  }
};
Record.prototype.setDefault = function (name) {
  debug(this.model.name + ': setDefault');
  var names;
  if (_.isUndefined(name)) {
    this.attrs = {};
    this.changes = {};
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
    .then((result) => this.set(result, {
      default_get: true
    }));
};
//
// exports
module.exports = Record;

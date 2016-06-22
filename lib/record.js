var _ = require('underscore');
var EventEmitter = require('events');
var methods = require('./methods');
var utils = require('./utils');
var debug = require('debug')('api:model:record');

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

function Record(session, modelName, model, id, group) {
  debug(modelName + ': new');
  this.session = session;
  this.session.on('stop', () => {
    this.emit('destroy');
  });
  this.modelName = modelName;
  this.model = model;
  this.id = id || -parseInt(_.uniqueId());
  this.group = group;
  this.attrs = {};
  this.changes = {};
  this.timestamp = null;
  this.readPromise = null;
  this.readFields = {};
}
_.inherit(Record, EventEmitter);
//
// create function that supports async (returns Promise)
Record.create = function (session, modelName, id, group) {
  return utils.getModel(session, modelName)
    .then((model) => new Record(session, modelName, model, id, group));
};
//
// context per record
Record.prototype.getContext = function () {
  debug(this.modelName + ': getContext');
  if (this.context) {
    return this.context;
  }
  else if (this.group) {
    return this.group.getContext();
  }
};
Record.prototype.setContext = function (context) {
  debug(this.modelName + ': setContext');
  this.context = context;
};
//
// for specific context
Record.prototype.loadModel = function () {
  debug(this.modelName + ': loadModel');
  utils.loadModel(this.session, this.modelName, this.getContext())
    .then((model) => {
      this.model = model;
    });
};
//
// accessors
Record.prototype.getTimestamp = function () {
  debug(this.modelName + ': getTimestamp');
  var res = {
    [this.modelName + ',' + this.id]: this.timestamp
  };
  _.each(this.readFields, (v, fieldName) => {
    _.extendOwn(res, this.model[fieldName].getTimestamp(this.attrs[
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
  debug(this.modelName + ': get ' + names);
  var context = this.getContext();
  var pairs = _.map(names, (name) => [name, this.model[name]]);
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
  debug(this.modelName + ': set ' + _.keys(values));
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
    return this.model[pair[0]].set(this.attrs[pair[0]], pair[1],
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
  debug(this.modelName + ': onChange ' + names);
  var paths = _.unique(_.flatten(_.map(names, (name) => this.model[name].on_change || [])));
  if (!_.isEmpty(paths)) {
    var values = flatten(this.get({
      on_change: true
    }), paths);
    return this.session.rpc('model.' + this.modelName + '.' + methods.modelOnChange, [
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
  debug(this.modelName + ': onChangeWith ' + names);
  var fieldNames = [];
  var postponed = [];
  var paths = [];
  _.each(this.model, (v, k) => {
    var ocw = v.on_change_with || [];
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
    return this.session.rpc('model.' + this.modelName + '.' + methods.modelOnChangeWith, [
        values, fieldNames
      ], this.getContext())
      .then((result) => this.set(result, {
        on_change: true
      }))
      .then(() => Promise.all(_.map(postponed, (fieldName) => {
        var values = flatten(this.get({
          on_change: true
        }), this.model[fieldName].on_change_with);
        return this.rpc('model.' + this.modelName + '.' + methods.modelOnChangeWith +
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
// read record from server
Record.prototype.read = function (names) {
  _.assert(this.id > 0, 'object is not saved');
  _.assert(this.readPromise, 'another read request is running');
  debug(this.modelName + ': read ' + names);
  var args = [
    [this.id]
  ];
  if (names) {
    args.push(names);
  }
  this.readPromise = this.session.rpc('model.' + this.modelName + '.' +
    methods.modelRead, args, this.getContext());
  this.promise.then((result) => {
    this.readPromise = null;
    result = result[this.id];
    _.extendOwn(this.readFields, _.mapObject(result, () => true));
    this.set(result, {
      read: true
    });
  });
};
//
// save record
Record.prototype.save = function () {
  debug(this.modelName + ': save');
  if (!_.isEmpty(this.changes)) {
    var promise;
    if (this.id > 0) {
      promise = this.session.rpc('model.' + this.modelName + '.' + methods.modelWrite, [
        [this.id], this.get(_.keys(this.changes), {
          save: true
        })
      ], _.extendOwn({}, this.getContext() || this.session.context, {
        _timestamp: this.getTimestamp()
      }));
    }
    else {
      var required = _.map(_.filter(_.pairs(this.model), (pair) => pair[1].required),
        (pair) => pair[0]);
      var attrs = this.get({
        save: true
      });
      var missing = _.difference(required, _.keys(attrs));
      _.assert(_.isEmpty(missing), 'required attrs: ' + missing);
      promise = this.session.rpc('model.' + this.modelName + '.' + methods.modelCreate, [
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
//
// set attributes default value
Record.prototype.setDefault = function (name) {
  debug(this.modelName + ': setDefault');
  var names;
  if (_.isUndefined(name)) {
    this.attrs = {};
    this.changes = {};
    names = _.keys(this.model);
  }
  else if (_.isString(name)) {
    names = [name];
  }
  else {
    names = name;
  }
  return this.session.rpc('model.' + this.modelName + '.' + methods.modelDefault, [
      names
    ], this.getContext())
    .then((result) => this.set(result, {
      default_get: true
    }));
};
//
// exports
module.exports = Record;

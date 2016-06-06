var _ = require('underscore');
var EventEmitter = require('events');
var methods = require('./methods');
var utils = require('./utils');

function Empty() {}
var empty = new Empty();

function Record(session, name, model, id, group) {
  this.session = session;
  this.session.on('stop', () => {
    this.emit('destroy');
  });
  this.name = name;
  this.model = model;
  this.id = id || -parseInt(_.uniqueId());
  this.group = group;
  this.attrs = {};
  this.changed = {};
  this.timestamp = null;
}
_.inherit(Record, EventEmitter);
//
// native constructor does not support async (promise)
Record.create = function (session, modelName, id, group) {
  return utils.getModel(session, modelName)
    .then((model) => new Record(session, modelName, model, id, group));
};
//
// context per record
Record.prototype.getContext = function () {
  if (this.context) {
    return this.context;
  }
  else if (this.group) {
    return this.group.getContext();
  }
};
Record.prototype.setContext = function (context) {
  this.context = context;
};
//
// by default, model is the same as on session. we can override here based on context
Record.prototype.loadModel = function () {
  utils.loadModel(this.session, this.name, this.getContext())
    .then((model) => {
      this.model = model;
    });
};
//
// get a record attribute
Record.prototype.get = function (key) {
  var field = this.model[key];
  if (!field) {
    return Promise.reject(key + ' is not a field');
  }
  else {
    // call field:get (transform from internal format to public)
    return field.get(this.attrs[key], this.getContext());
  }
};
//
// set record attribute(s)
Record.prototype.set = function (key, value, options) {
  var values;
  if (_.isObject(key)) {
    values = key;
    options = value;
  }
  else {
    values = {};
    values[key] = value;
  }
  options = _.extendOwn({
    touch: true, // update changed internal state
    emit: true, // emit changed and field:changed events
    sync: true, // perform server events (on_change, on change_with, ...)
  }, options);
  var notAField = values.findKey((v, k) => {
    return !_.contains(this.model, k);
  });
  if (notAField) {
    return Promise.reject(notAField + ' is not a field');
  }
  var context = this.getContext();
  var changes = {};
  var keys = _.keys(values);
  var vals = _.map(keys, (k) => values[k]);
  // call field:set on all fields (transform input)
  var promise = Promise.all(_.map(keys, (k, i) => {
    return this.model[k].set(vals[i], context);
  }));
  // set values and update changes
  promise = promise.then((result) => {
    keys.forEach((k, i) => {
      var newVal = result[i];
      var oldVal = this.attrs[k];
      if (!_.isEqual(oldVal, newVal)) {
        changes[k] = _.isUndefined(oldVal) ? empty : oldVal;
        this.attrs[k] = newVal;
      }
    });
    if (!_.isEmpty(changes)) {
      if (options.touch) {
        _.extendOwn(this.changed, changes);
      }
      if (options.emit) {
        this.emit('change');
        _.forEach(changes, (v, k) => {
          this.emit('change', this.attrs(k), v);
        });
      }
    }
  });
  // hit server events
  if (!_.isEmpty(changes) && options.sync) {
    promise = promise.then(() => this.change(_.keys(changes)));
  }
  return promise;
};
//
// call server triggers on change
Record.prototype.change = function () {};
//
// set attributes default value
Record.prototype.setDefault = function () {
  this.attrs = {};
  this.changes = {};
  return this.session.rpc('model.' + this.name + '.' + methods.modelDefault)
    .then((result) => this.set(result, {
      sync: false
    }));
};
//
// save record
Record.prototype.save = function () {};
//
// exports
module.exports = Record;

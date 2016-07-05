var _ = require('underscore');
var EventEmitter = require('events');
var methods = require('./methods');
var utils = require('./utils');
var debug = require('debug')('api:model:group');
var Record = require('./record');

function Group(session, model, records, origin, name) {
  if (this instanceof Group) {
    debug(model.name + ': constructor');
    this.session = session;
    this.session.on('stop', () => {
      this.emit('destroy');
    });
    this.modelName = model.name;
    this.model = model.model;
    this.origin = origin;
    this.name = name;
    this.records = _.map(records, (id) => new Record(this.session, {
      name: this.modelName,
      model: this.model
    }, id, this));
  }
  else {
    debug(model + ': new');
    var modelName = model;
    return utils.getModel(session, modelName)
      .then((model) => new Group(session, {
        name: modelName,
        model: model
      }, records, origin, name));
  }
}
_.inherit(Group, EventEmitter);
//
// underscore helpers (credits: http://backbonejs.org/docs/backbone.html)
var slice = Array.prototype.slice;
var modelMatcher = function (attrs) {
  var matcher = _.matches(attrs);
  return function (model) {
    return matcher(model.attributes);
  };
};
var cb = function (iteratee, instance) {
  if (_.isFunction(iteratee)) {
    return iteratee;
  }
  if (_.isObject(iteratee) && !instance._isModel(iteratee)) {
    return modelMatcher(iteratee);
  }
  if (_.isString(iteratee)) {
    return function (model) {
      return model.get(iteratee);
    };
  }
  return iteratee;
};
var addMethod = function (length, method, attribute) {
  switch (length) {
  case 1:
    return function () {
      return _[method](this[attribute]);
    };
  case 2:
    return function (value) {
      return _[method](this[attribute], value);
    };
  case 3:
    return function (iteratee, context) {
      return _[method](this[attribute], cb(iteratee, this), context);
    };
  case 4:
    return function (iteratee, defaultVal, context) {
      return _[method](this[attribute], cb(iteratee, this), defaultVal,
        context);
    };
  default:
    return function () {
      var args = slice.call(arguments);
      args.unshift(this[attribute]);
      return _[method].apply(_, args);
    };
  }
};
var addUnderscoreMethods = function (Class, methods, attribute) {
  _.each(methods, function (length, method) {
    if (_[method]) {
      Class.prototype[method] = addMethod(length, method, attribute);
    }
  });
};
var groupMethods = {
  forEach: 3,
  each: 3,
  map: 3,
  collect: 3,
  reduce: 0,
  foldl: 0,
  inject: 0,
  reduceRight: 0,
  foldr: 0,
  find: 3,
  detect: 3,
  filter: 3,
  select: 3,
  reject: 3,
  every: 3,
  all: 3,
  some: 3,
  any: 3,
  include: 3,
  includes: 3,
  contains: 3,
  invoke: 0,
  max: 3,
  min: 3,
  toArray: 1,
  size: 1,
  first: 3,
  head: 3,
  take: 3,
  initial: 3,
  rest: 3,
  tail: 3,
  drop: 3,
  last: 3,
  without: 0,
  difference: 0,
  indexOf: 3,
  shuffle: 1,
  lastIndexOf: 3,
  isEmpty: 1,
  chain: 1,
  sample: 3,
  partition: 3,
  groupBy: 3,
  countBy: 3,
  sortBy: 3,
  indexBy: 3,
  findIndex: 3,
  findLastIndex: 3
};
addUnderscoreMethods(Group, groupMethods, 'records');
//
// context
Group.prototype.setContext = function (context) {
  debug(this.modelName + ': setContext');
  if (!(_.isUndefined(context) || context === null)) {
    this.context = context;
  }
};
Group.prototype.getContext = function () {
  debug(this.modelName + ': getContext');
  var result = {};
  if (this.context) {
    _.extendOwn(result, this.context);
  }
  if (this.origin) {
    _.extendOwn(result, this.origin.context || {});
    _.extendOwn(result, this.origin.getFieldContext(this.name));
  }
  return result;
};
// construct actions
Group.search = function (session, modelName, desc, context) {
  return session.rpc('model.' + modelName + '.' + methods.modelSearch, [
      desc.domain || [], desc.offset || null, desc.limit || null, desc.order ||
      null
    ], context)
    .then((results) => {
      return Group(session, modelName, results)
        .then((group) => {
          group.setContext(context);
          return group;
        });
    });
};
//
// exports
module.exports = Group;

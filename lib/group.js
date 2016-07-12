var _ = require('underscore');
var EventEmitter = require('events');
var debug = require('debug')('api:model:group');
var methods = require('./methods');
var Model = require('./model');
var Record = require('./record');
var patch = require('./group-underscore');

function Group(session, model, records, origin, name) {
  if (this instanceof Group) {
    debug(model.name + ': constructor');
    this.session = session;
    this.session.on('stop', () => {
      this.emit('destroy');
    });
    this.model = model;
    this.origin = origin;
    this.name = name;
    this.records = _.map(records, (id) => new Record(this.session, this.model,
      id, this));
  }
  else {
    debug(model + ': new');
    var modelName = model;
    return Model.get(session, modelName)
      .then((model) => new Group(session, model, records, origin, name));
  }
}
_.inherit(Group, EventEmitter);
patch(Group, 'records');
//
// context
Group.prototype.setContext = function (context) {
  debug(this.model.name + ': setContext');
  if (!(_.isUndefined(context) || context === null)) {
    this.context = context;
  }
};
Group.prototype.getContext = function () {
  debug(this.model.name + ': getContext');
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

var _ = require('lodash');
var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function TimeDeltaField(model, desc) {
  Field.call(this, model, desc);
}
inherits(TimeDeltaField, Field);
TimeDeltaField.prototype.get = function (value, options) {
  if (options.rpc) {
    return types.timedelta(value);
  }
  else {
    return value;
  }
};
TimeDeltaField.prototype.set = function (value) {
  if (_.isString(value)) {
    return value;
  }
  else {
    return types.stringify(value);
  }
};
//
// exports
module.exports = TimeDeltaField;

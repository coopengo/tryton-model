var _ = require('lodash');
var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function DateTimeField(model, desc) {
  Field.call(this, model, desc);
}
inherits(DateTimeField, Field);
DateTimeField.prototype.get = function (value, options) {
  if (options.rpc) {
    return types.datetime(value);
  }
  else {
    return value;
  }
};
DateTimeField.prototype.set = function (value) {
  if (_.isString(value)) {
    return value;
  }
  else {
    return types.stringify(value);
  }
};
//
// exports
module.exports = DateTimeField;

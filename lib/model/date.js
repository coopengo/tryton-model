var _ = require('lodash');
var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function DateField(model, desc) {
  Field.call(this, model, desc);
}
inherits(DateField, Field);
DateField.prototype.get = function (value, options) {
  if (options.rpc) {
    return types.date(value);
  }
  else {
    return value;
  }
};
DateField.prototype.set = function (value) {
  if (_.isString(value)) {
    return value;
  }
  else {
    return types.stringify(value);
  }
};
//
// exports
module.exports = DateField;

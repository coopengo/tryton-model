var _ = require('lodash');
var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function NumericField(model, desc) {
  Field.call(this, model, desc);
}
inherits(NumericField, Field);
NumericField.prototype.get = function (value, options) {
  if (options.rpc || options.oc) {
    return types.decimal(value);
  }
  else {
    return value;
  }
};
NumericField.prototype.set = function (value) {
  if (_.isNumber(value) && !types.isDecimal(value)) {
    return value;
  }
  else {
    return Number(value);
  }
};
//
// exports
module.exports = NumericField;

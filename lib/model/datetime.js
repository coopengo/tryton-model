var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function DateTimeField(model, desc) {
  Field.call(this, model, desc);
}
inherits(DateTimeField, Field);
DateTimeField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.datetime(value);
  }
  else {
    return value;
  }
};
DateTimeField.prototype.tset = function (value) {
  return types.stringify(value);
};
//
// exports
module.exports = DateTimeField;

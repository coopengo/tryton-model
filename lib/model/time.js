var inherits = require('inherits');
var types = require('tryton-types');
var Field = require('./field');

function TimeField(model, desc) {
  Field.call(this, model, desc);
}
inherits(TimeField, Field);
TimeField.prototype.get = function (value, options) {
  if (options.rpc) {
    return types.time(value);
  }
  else {
    return value;
  }
};
TimeField.prototype.set = function (value) {
  return types.stringify(value);
};
//
// exports
module.exports = TimeField;

var _ = require('lodash');
var inherits = require('inherits');
var Field = require('./field');

function Many2OneField(model, desc) {
  Field.call(this, model, desc);
}
inherits(Many2OneField, Field);
Many2OneField.prototype.cls = 'record';
Many2OneField.prototype.set = function (value) {
  if (_.isNull(value)) {
    return null;
  }
  else {
    if (_.isNumber(value)) {
      return value;
    }
    else if (_.isObjectLike(value) && !_.isArray(value)) {
      return value.id;
    }
    else {
      throw new Error('unsupported value type');
    }
  }
};
//
// exports
module.exports = Many2OneField;

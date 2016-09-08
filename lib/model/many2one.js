var _ = require('underscore');
var Field = require('./field');

function Many2OneField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(Many2OneField, Field);
Many2OneField.prototype.cls = 'record';
Many2OneField.prototype.set = function (value) {
  if (_.isNull(value)) {
    return null;
  }
  else {
    if (_.isNumber(value)) {
      return value;
    }
    else if (_.isObject(value) && !_.isArray(value)) {
      return value.id;
    }
    else {
      _.raise('unsupported value type');
    }
  }
};
//
// exports
module.exports = Many2OneField;

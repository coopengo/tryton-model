var _ = require('underscore');
var Field = require('./field');

function Many2OneField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(Many2OneField, Field);
Many2OneField.prototype.get = function (value, options, context) {
  if (options.save) {
    return value ? value.id : value;
  }
  else {
    return this.__.get.call(this, value, options, context);
  }
};
//
// exports
module.exports = Many2OneField;

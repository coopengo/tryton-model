var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function Many2ManyField(model, desc) {
  Field.call(this, model, desc);
}
inherits(Many2ManyField, Field);
Many2ManyField.prototype.cls = 'group';
Many2ManyField.prototype.set = function (value, options) {
  return rel.set2Many(value, options.old);
};
//
// exports
module.exports = Many2ManyField;

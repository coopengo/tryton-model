var inherits = require('inherits');
var Field = require('./field');

function Many2ManyField(model, desc) {
  Field.call(this, model, desc);
}
inherits(Many2ManyField, Field);
Many2ManyField.prototype.cls = 'group';
//
// exports
module.exports = Many2ManyField;

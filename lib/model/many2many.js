var _ = require('underscore');
var Field = require('./field');

function Many2ManyField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(Many2ManyField, Field);
Many2ManyField.prototype.cls = 'group';
//
// exports
module.exports = Many2ManyField;

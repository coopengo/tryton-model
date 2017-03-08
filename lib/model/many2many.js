var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function Many2ManyField(model, desc) {
  Field.call(this, model, desc);
}
inherits(Many2ManyField, Field);
Many2ManyField.prototype.cls = 'group';
Many2ManyField.prototype.tset = function (value, options) {
  return rel.set2Many.call(this, value, options);
};
Many2ManyField.prototype.tget = function (value, options) {
  return rel.get2Many.call(this, value, options);
};
//
// exports
module.exports = Many2ManyField;

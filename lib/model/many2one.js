var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function Many2OneField(model, desc) {
  Field.call(this, model, desc);
}
inherits(Many2OneField, Field);
Many2OneField.prototype.cls = 'record';
Many2OneField.prototype.tset = function (value) {
  return rel.set2One.call(this, value);
};
Many2OneField.prototype.tget = function (value) {
  return rel.get2One.call(this, value);
};
//
// exports
module.exports = Many2OneField;

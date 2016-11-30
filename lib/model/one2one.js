var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function One2OneField(model, desc) {
  Field.call(this, model, desc);
}
inherits(One2OneField, Field);
One2OneField.prototype.cls = 'record';
One2OneField.prototype.set = function (value) {
  return rel.set2One.call(this, value);
};
One2OneField.prototype.get = function (value) {
  return rel.get2One.call(this, value);
};
//
// exports
module.exports = One2OneField;

var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function One2ManyField(model, desc) {
  Field.call(this, model, desc);
}
inherits(One2ManyField, Field);
One2ManyField.prototype.cls = 'group';
One2ManyField.prototype.tset = function (value, options) {
  return rel.set2Many.call(this, value, options);
};
One2ManyField.prototype.tget = function (value, options) {
  return rel.get2Many.call(this, value, options);
};
//
// exports
module.exports = One2ManyField;

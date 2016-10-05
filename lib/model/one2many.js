var inherits = require('inherits');
var Field = require('./field');
var rel = require('./rel');

function One2ManyField(model, desc) {
  Field.call(this, model, desc);
}
inherits(One2ManyField, Field);
One2ManyField.prototype.cls = 'group';
One2ManyField.prototype.set = function (value, options) {
  return rel.set2Many(value, options.old);
};
//
// exports
module.exports = One2ManyField;

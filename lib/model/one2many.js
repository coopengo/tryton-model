var _ = require('underscore');
var Field = require('./field');

function One2ManyField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(One2ManyField, Field);
One2ManyField.prototype.cls = 'group';
//
// exports
module.exports = One2ManyField;

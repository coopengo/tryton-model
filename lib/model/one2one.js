var _ = require('underscore');
var Field = require('./field');

function One2OneField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(One2OneField, Field);
One2OneField.prototype.cls = 'record';
//
// exports
module.exports = One2OneField;

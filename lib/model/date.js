var _ = require('underscore');
var Field = require('./field');

function DateField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(DateField, Field);
//
// exports
module.exports = DateField;

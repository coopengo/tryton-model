var _ = require('underscore');
var Field = require('./field');

function DateField(desc) {
  Field.call(this, desc);
}
_.inherit(DateField, Field);
//
// exports
module.exports = DateField;

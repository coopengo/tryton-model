var _ = require('underscore');
var Field = require('./field');

function NumericField(desc) {
  Field.call(this, desc);
}
_.inherit(NumericField, Field);
//
// exports
module.exports = NumericField;

var _ = require('underscore');
var Field = require('./field');

function NumericField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(NumericField, Field);
//
// exports
module.exports = NumericField;

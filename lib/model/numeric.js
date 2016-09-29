var inherits = require('inherits');
var Field = require('./field');

function NumericField(model, desc) {
  Field.call(this, model, desc);
}
inherits(NumericField, Field);
//
// exports
module.exports = NumericField;

var inherits = require('inherits');
var Field = require('./field');

function BinaryField(model, desc) {
  Field.call(this, model, desc);
}
inherits(BinaryField, Field);
//
// exports
module.exports = BinaryField;

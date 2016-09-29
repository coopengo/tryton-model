var inherits = require('inherits');
var Field = require('./field');

function BooleanField(model, desc) {
  Field.call(this, model, desc);
}
inherits(BooleanField, Field);
//
// exports
module.exports = BooleanField;

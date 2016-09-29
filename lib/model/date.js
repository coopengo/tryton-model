var inherits = require('inherits');
var Field = require('./field');

function DateField(model, desc) {
  Field.call(this, model, desc);
}
inherits(DateField, Field);
//
// exports
module.exports = DateField;

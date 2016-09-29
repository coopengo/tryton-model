var inherits = require('inherits');
var Field = require('./field');

function DateTimeField(model, desc) {
  Field.call(this, model, desc);
}
inherits(DateTimeField, Field);
//
// exports
module.exports = DateTimeField;

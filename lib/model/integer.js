var inherits = require('inherits');
var Field = require('./field');

function IntegerField(model, desc) {
  Field.call(this, model, desc);
}
inherits(IntegerField, Field);
//
// exports
module.exports = IntegerField;

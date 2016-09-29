var inherits = require('inherits');
var Field = require('./field');

function FloatField(model, desc) {
  Field.call(this, model, desc);
}
inherits(FloatField, Field);
//
// exports
module.exports = FloatField;

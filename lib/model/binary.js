var _ = require('underscore');
var Field = require('./field');

function BinaryField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(BinaryField, Field);
//
// exports
module.exports = BinaryField;

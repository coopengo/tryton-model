var _ = require('underscore');
var Field = require('./field');

function BinaryField(desc) {
  Field.call(this, desc);
}
_.inherit(BinaryField, Field);
//
// exports
module.exports = BinaryField;

var _ = require('underscore');
var Field = require('./field');

function BinaryField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(BinaryField, Field);
//
// exports
module.exports = BinaryField;

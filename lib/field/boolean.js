var _ = require('underscore');
var Field = require('./field');

function BooleanField(desc) {
  Field.call(this, desc);
}
_.inherit(BooleanField, Field);
//
// exports
module.exports = BooleanField;

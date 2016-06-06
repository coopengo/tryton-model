var _ = require('underscore');
var Field = require('./field');

function ReferenceField(desc) {
  Field.call(this, desc);
}
_.inherit(ReferenceField, Field);
//
// exports
module.exports = ReferenceField;

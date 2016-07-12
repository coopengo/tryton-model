var _ = require('underscore');
var Field = require('./field');

function ReferenceField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(ReferenceField, Field);
//
// exports
module.exports = ReferenceField;

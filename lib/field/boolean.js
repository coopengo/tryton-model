var _ = require('underscore');
var Field = require('./field');

function BooleanField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(BooleanField, Field);
//
// exports
module.exports = BooleanField;

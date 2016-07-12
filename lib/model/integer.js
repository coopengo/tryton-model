var _ = require('underscore');
var Field = require('./field');

function IntegerField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(IntegerField, Field);
//
// exports
module.exports = IntegerField;

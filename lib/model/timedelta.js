var _ = require('underscore');
var Field = require('./field');

function TimeDeltaField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(TimeDeltaField, Field);
//
// exports
module.exports = TimeDeltaField;

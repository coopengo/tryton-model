var _ = require('underscore');
var Field = require('./field');

function TimeDeltaField(desc) {
  Field.call(this, desc);
}
_.inherit(TimeDeltaField, Field);
//
// exports
module.exports = TimeDeltaField;

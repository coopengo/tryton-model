var _ = require('underscore');
var Field = require('./field');

function TimeDeltaField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(TimeDeltaField, Field);
//
// exports
module.exports = TimeDeltaField;

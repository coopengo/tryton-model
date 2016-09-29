var inherits = require('inherits');
var Field = require('./field');

function TimeDeltaField(model, desc) {
  Field.call(this, model, desc);
}
inherits(TimeDeltaField, Field);
//
// exports
module.exports = TimeDeltaField;

var _ = require('underscore');
var Field = require('./field');

function FloatField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(FloatField, Field);
//
// exports
module.exports = FloatField;

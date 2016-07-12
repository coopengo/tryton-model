var _ = require('underscore');
var Field = require('./field');

function NumericField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(NumericField, Field);
//
// exports
module.exports = NumericField;

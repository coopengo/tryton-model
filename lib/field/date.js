var _ = require('underscore');
var Field = require('./field');

function DateField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(DateField, Field);
//
// exports
module.exports = DateField;

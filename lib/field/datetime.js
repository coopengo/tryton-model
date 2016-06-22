var _ = require('underscore');
var Field = require('./field');

function DateTimeField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(DateTimeField, Field);
//
// exports
module.exports = DateTimeField;

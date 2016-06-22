var _ = require('underscore');
var Field = require('./field');

function TimeField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(TimeField, Field);
//
// exports
module.exports = TimeField;

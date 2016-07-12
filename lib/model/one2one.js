var _ = require('underscore');
var Field = require('./field');

function One2OneField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(One2OneField, Field);
//
// exports
module.exports = One2OneField;

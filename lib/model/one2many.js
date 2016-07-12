var _ = require('underscore');
var Field = require('./field');

function One2ManyField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(One2ManyField, Field);
//
// exports
module.exports = One2ManyField;

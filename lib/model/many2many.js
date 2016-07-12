var _ = require('underscore');
var Field = require('./field');

function Many2ManyField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(Many2ManyField, Field);
//
// exports
module.exports = Many2ManyField;

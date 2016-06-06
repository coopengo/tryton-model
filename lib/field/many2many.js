var _ = require('underscore');
var Field = require('./field');

function Many2ManyField(desc) {
  Field.call(this, desc);
}
_.inherit(Many2ManyField, Field);
//
// exports
module.exports = Many2ManyField;

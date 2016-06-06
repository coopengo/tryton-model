var _ = require('underscore');
var Field = require('./field');

function Many2OneField(desc) {
  Field.call(this, desc);
}
_.inherit(Many2OneField, Field);
//
// exports
module.exports = Many2OneField;

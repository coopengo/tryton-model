var _ = require('underscore');
var Field = require('./field');

function DateTimeField(desc) {
  Field.call(this, desc);
}
_.inherit(DateTimeField, Field);
//
// exports
module.exports = DateTimeField;

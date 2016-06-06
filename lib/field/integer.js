var _ = require('underscore');
var Field = require('./field');

function IntegerField(desc) {
  Field.call(this, desc);
}
_.inherit(IntegerField, Field);
//
// exports
module.exports = IntegerField;

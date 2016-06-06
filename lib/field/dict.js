var _ = require('underscore');
var Field = require('./field');

function DictField(desc) {
  Field.call(this, desc);
}
_.inherit(DictField, Field);
//
// exports
module.exports = DictField;

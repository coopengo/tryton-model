var _ = require('underscore');
var Field = require('./field');

function TimeField(desc) {
  Field.call(this, desc);
}
_.inherit(TimeField, Field);
//
// exports
module.exports = TimeField;

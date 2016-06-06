var _ = require('underscore');
var Field = require('./field');

function FloatField(desc) {
  Field.call(this, desc);
}
_.inherit(FloatField, Field);
//
// exports
module.exports = FloatField;

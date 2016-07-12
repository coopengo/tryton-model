var _ = require('underscore');
var Field = require('./field');

function IntegerField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(IntegerField, Field);
//
// exports
module.exports = IntegerField;

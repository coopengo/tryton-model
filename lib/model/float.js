var _ = require('underscore');
var Field = require('./field');

function FloatField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(FloatField, Field);
//
// exports
module.exports = FloatField;

var _ = require('underscore');
var Field = require('./field');

function BooleanField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(BooleanField, Field);
//
// exports
module.exports = BooleanField;

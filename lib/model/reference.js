var _ = require('underscore');
var Field = require('./field');

function ReferenceField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(ReferenceField, Field);
//
// exports
module.exports = ReferenceField;

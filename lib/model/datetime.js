var _ = require('underscore');
var Field = require('./field');

function DateTimeField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(DateTimeField, Field);
//
// exports
module.exports = DateTimeField;

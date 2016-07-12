var _ = require('underscore');
var Field = require('./field');

function TimeField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(TimeField, Field);
//
// exports
module.exports = TimeField;

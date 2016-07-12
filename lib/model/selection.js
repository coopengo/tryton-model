var _ = require('underscore');
var Field = require('./field');

function SelectionField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(SelectionField, Field);
//
// exports
module.exports = SelectionField;

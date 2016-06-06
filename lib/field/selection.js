var _ = require('underscore');
var Field = require('./field');

function SelectionField(desc) {
  Field.call(this, desc);
}
_.inherit(SelectionField, Field);
//
// exports
module.exports = SelectionField;

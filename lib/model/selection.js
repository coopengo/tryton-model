var _ = require('underscore');
var Field = require('./field');

function SelectionField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(SelectionField, Field);
//
// exports
module.exports = SelectionField;

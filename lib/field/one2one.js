var _ = require('underscore');
var Field = require('./field');

function One2OneField(desc) {
  Field.call(this, desc);
}
_.inherit(One2OneField, Field);
//
// exports
module.exports = One2OneField;

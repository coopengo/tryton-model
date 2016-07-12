var _ = require('underscore');
var Field = require('./field');

function One2OneField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(One2OneField, Field);
//
// exports
module.exports = One2OneField;

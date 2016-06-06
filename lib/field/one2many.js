var _ = require('underscore');
var Field = require('./field');

function One2ManyField(desc) {
  Field.call(this, desc);
}
_.inherit(One2ManyField, Field);
//
// exports
module.exports = One2ManyField;

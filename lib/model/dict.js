var _ = require('underscore');
var Field = require('./field');

function DictField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(DictField, Field);
//
// exports
module.exports = DictField;

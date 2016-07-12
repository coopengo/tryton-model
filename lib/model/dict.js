var _ = require('underscore');
var Field = require('./field');

function DictField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(DictField, Field);
//
// exports
module.exports = DictField;

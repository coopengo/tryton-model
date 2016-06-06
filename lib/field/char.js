var _ = require('underscore');
var Field = require('./field');

function CharField(desc) {
  Field.call(this, desc);
}
_.inherit(CharField, Field);
//
// exports
module.exports = CharField;

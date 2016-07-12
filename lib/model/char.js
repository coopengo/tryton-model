var _ = require('underscore');
var Field = require('./field');

function CharField(session, desc) {
  Field.call(this, session, desc);
}
_.inherit(CharField, Field);
//
// exports
module.exports = CharField;

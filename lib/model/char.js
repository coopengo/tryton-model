var _ = require('underscore');
var Field = require('./field');

function CharField(model, desc) {
  Field.call(this, model, desc);
}
_.inherit(CharField, Field);
//
// exports
module.exports = CharField;

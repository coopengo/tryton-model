var _ = require('underscore');
var Field = require('./field');

function One2ManyField(model, desc) {
  Field.call(this, model, desc);
  this.target_model = desc.target_model;
}
_.inherit(One2ManyField, Field);
//
// exports
module.exports = One2ManyField;

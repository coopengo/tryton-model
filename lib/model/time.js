var inherits = require('inherits');
var Field = require('./field');

function TimeField(model, desc) {
  Field.call(this, model, desc);
}
inherits(TimeField, Field);
//
// exports
module.exports = TimeField;

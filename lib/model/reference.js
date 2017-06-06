var inherits = require('inherits')
var Field = require('./field')

function ReferenceField (model, desc) {
  Field.call(this, model, desc)
}
inherits(ReferenceField, Field)

module.exports = ReferenceField

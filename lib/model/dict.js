var inherits = require('inherits')
var Field = require('./field')

function DictField (model, desc) {
  Field.call(this, model, desc)
}
inherits(DictField, Field)

module.exports = DictField

var inherits = require('inherits')
var Field = require('./field')

function CharField (model, desc) {
  Field.call(this, model, desc)
}
inherits(CharField, Field)

module.exports = CharField

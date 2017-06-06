var inherits = require('inherits')
var Field = require('./field')

function SelectionField (model, desc) {
  Field.call(this, model, desc)
}
inherits(SelectionField, Field)

module.exports = SelectionField

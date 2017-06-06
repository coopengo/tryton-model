var inherits = require('inherits')
var types = require('tryton-types')
var Field = require('./field')

function NumericField (model, desc) {
  Field.call(this, model, desc)
}
inherits(NumericField, Field)

NumericField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.decimal(value)
  } else {
    return value
  }
}

NumericField.prototype.tset = function (value) {
  if (types.isDecimal(value)) {
    return value.val()
  } else {
    return value
  }
}

module.exports = NumericField

var inherits = require('inherits')
var types = require('tryton-types')
var Field = require('./field')

function BinaryField (model, desc) {
  Field.call(this, model, desc)
}
inherits(BinaryField, Field)

BinaryField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.binary(value)
  } else {
    return value
  }
}

BinaryField.prototype.tset = function (value) {
  if (types.isBinary(value)) {
    return value.val()
  } else {
    return value
  }
}

module.exports = BinaryField

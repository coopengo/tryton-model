var inherits = require('inherits')
var types = require('tryton-types')
var Field = require('./field')

function DateField (model, desc) {
  Field.call(this, model, desc)
}
inherits(DateField, Field)

DateField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.date(value)
  } else {
    return value
  }
}

DateField.prototype.tset = function (value) {
  return types.stringify(value)
}

module.exports = DateField

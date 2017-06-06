var inherits = require('inherits')
var types = require('tryton-types')
var Field = require('./field')

function TimeField (model, desc) {
  Field.call(this, model, desc)
}
inherits(TimeField, Field)

TimeField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.time(value)
  } else {
    return value
  }
}

TimeField.prototype.tset = function (value) {
  return types.stringify(value)
}

module.exports = TimeField

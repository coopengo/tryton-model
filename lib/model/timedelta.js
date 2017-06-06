var inherits = require('inherits')
var types = require('tryton-types')
var Field = require('./field')

function TimeDeltaField (model, desc) {
  Field.call(this, model, desc)
}
inherits(TimeDeltaField, Field)

TimeDeltaField.prototype.tget = function (value, options) {
  if (options.rpc || options.oc) {
    return types.timedelta(value)
  } else {
    return value
  }
}

TimeDeltaField.prototype.tset = function (value) {
  return types.stringify(value)
}

module.exports = TimeDeltaField

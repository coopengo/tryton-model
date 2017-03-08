var _ = require('lodash');

function Field(model, desc) {
  this.model = model;
  this.name = desc.name;
  this.desc = desc;
}
Field.prototype.tget = function (value) {
  return value;
};
Field.prototype.get = function (value, options) {
  return _.isNil(value) ? null : this.tget(value, options);
};
Field.prototype.tset = function (value) {
  return value;
};
Field.prototype.set = function (value, options) {
  return _.isNil(value) ? null : this.tset(value, options);
};
//
// exports
module.exports = Field;

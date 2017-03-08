var _ = require('lodash');

function Field(model, desc) {
  this.model = model;
  this.name = desc.name;
  this.desc = desc;
}

function Empty() {}
var empty = Field.empty = new Empty();
//
Field.prototype.tget = function (value) {
  return value;
};
Field.prototype.get = function (value, options) {
  if (_.isUndefined(value)) {
    return;
  }
  else {
    return this.tget(value, options);
  }
};
Field.prototype.tset = function (value) {
  return value;
};
Field.prototype.set = function (value, options) {
  if (value === empty) {
    return;
  }
  else {
    return this.tset(value, options);
  }
};
//
// exports
module.exports = Field;

function Field(model, desc) {
  this.model = model;
  this.name = desc.name;
  this.desc = desc;
}
//
Field.prototype.get = function (value) {
  return value;
};
Field.prototype.set = function (value) {
  return value;
};
Field.prototype.getDefault = function () {
  return null;
};
//
// exports
module.exports = Field;

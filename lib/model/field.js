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
Field.prototype.getTimestamp = function () {
  return {};
};
//
// exports
module.exports = Field;

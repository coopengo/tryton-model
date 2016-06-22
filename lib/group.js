function Group(session, modelName, model, records, origin, name) {
  this.session = session;
  this.session.on('stop', () => {
    this.emit('destroy');
  });
  this.modelName = modelName;
  this.model = model;
  this.origin = origin;
  this.name = name;
}
//
// exports
module.exports = Group;

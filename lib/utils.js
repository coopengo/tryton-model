var _ = require('underscore');
var methods = require('./methods');
var field = require('./field');
//
function checkAccess(session, modelName, action) {
  if (session.access[modelName]) {
    return !!session.access[modelName][action];
  }
  return false;
}

function loadModel(session, modelName, context) {
  return session.rpc('model.' + modelName + '.' + methods.modelFields, [],
      context)
    .then((result) => {
      result = _.mapObject(result, (f) => field(session, f));
      if (context) {
        return result;
      }
      else {
        session.model[modelName] = result;
        return result;
      }
    });
}

function getModel(session, modelName) {
  if (session.model[modelName]) {
    return Promise.resolve(session.model[modelName]);
  }
  else {
    return loadModel(session, modelName);
  }
}

function search(session, modelName, criteria, offset, limit, order, context) {
  return session.rpc('model.' + modelName + '.' + methods.modelSearch, [
    criteria, offset, limit, order
  ], context);
}
// TODO: add here common model actions (search_read, search_count, etc)
//
// exports
exports.checkAccess = checkAccess;
exports.loadModel = loadModel;
exports.getModel = getModel;
exports.search = search;

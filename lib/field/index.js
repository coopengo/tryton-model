/* jshint -W069 */
var types = {
  'char': require('./char'),
  'selection': require('./selection'),
  'datetime': require('./datetime'),
  'date': require('./date'),
  'time': require('./time'),
  'timedelta': require('./timedelta'),
  'float': require('./float'),
  'numeric': require('./numeric'),
  'integer': require('./integer'),
  'boolean': require('./boolean'),
  'many2one': require('./many2one'),
  'one2one': require('./one2one'),
  'one2many': require('./one2many'),
  'many2many': require('./many2many'),
  'reference': require('./reference'),
  'binary': require('./binary'),
  'dict': require('./dict')
};

function create(session, desc) {
  var type = desc.type;
  var cls = types[type] || types['char'];
  return new cls(session, desc);
}
module.exports = create;

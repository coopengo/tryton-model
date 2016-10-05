### API

- `toJSON`: takes depth parameter to stop propagate
- `read`: when passing `!fieldName`, it reads all but fieldName
- `Group.group`: create a group from a records iterable
- `Record.get`: option instanciate => inst

### Behaviour

- `Group.read`: when some records are being read, read the others and wait for the whole
- `Record.attrs`: date / time fields are stored as flat string

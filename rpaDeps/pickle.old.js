var Pickle ={}

var Parser = function() {
    this.mark = 'THIS-NEEDS-TO-BE-UNIQUE-TO-SERVE-AS-A-BOUNDARY';
    this.memo = {};
    this.stack = [];
};
var usedOpcodes = {};

Parser.prototype.load = function(pickle) {
    var MARK = '('              // push special markobject on stack
      , STOP = '.'              // every pickle ends with STOP
      , BINUNICODE = 'X'        //   "     "       "  ; counted UTF-8 string argument
      , APPEND = 'a'            // append stack top to list below it
      , EMPTY_DICT = '}'        // push empty dict
      , BINPUT = 'q'            //   "     "    "   "   " ;   "    " 1-byte arg
      , BININT = 'J'            // push 4-byte signed int
      , LONG_BINPUT = 'r'       //   "     "    "   "   " ;   "    " 4-byte arg
      , SETITEMS = 'u'          // modify dict by adding topmost key+value pairs
      , SHORT_BINSTRING = 'U'   //  "     "   ;    "      "       "      " < 256 bytes
      , EMPTY_LIST = ']'        // push empty list
      // protocol 2
      , PROTO = '\x80'          // identify pickle protocol
      , TUPLE3 = '\x87'         // build 3-tuple from three topmost stack items
      , LONG1 = '\x8a'          // push long from < 256 bytes
      
      , BINGET = "h"
      ;

    var buffer = new Buffer(pickle, 'binary');
    buffer.readLine = function(i) {
        var index = pickle.indexOf('\n', i);
        if (index == -1) {
            debugger
            throw "Could not find end of line";
        }
        return pickle.substr(i, index - i);
    }

    for (var i = 0; i < pickle.length; ) {
        var opindex = i
          , opcode = pickle[i++];
        usedOpcodes[opcode] = true;
        switch (String.fromCharCode(opcode)) {
        // protocol 2
        case PROTO:
            var proto = buffer.readUInt8(i++);
            if (proto !== 2 && proto !== 3)
                throw 'Unhandled pickle protocol version: ' + proto;
            break;
        case TUPLE3:
            var c = this.stack.pop()
              , b = this.stack.pop()
              , a = this.stack.pop();
            this.stack.push([a, b, c]);
            break;
        case LONG1:
            var length = buffer.readUInt8(i++);
            var val = 0n;
            for (var x = 0; x < length; x++) {
                val |= BigInt(buffer[x+i]) << (BigInt(x) * 8n);
            }
            i += length;
            this.stack.push(length == 2 ? ((val & 0x8000n) ? val | 0xFFFF0000n : val) : val);
            
            break;
        case EMPTY_DICT:
            this.stack.push({});
            break;
        case EMPTY_LIST:
            this.stack.push([]);
            break;
        case BININT:
            this.stack.push(buffer.readInt32LE(i));
            i += 4;
            break;
        case BINPUT:
            var index = buffer.readUInt8(i++);
            this.memo['' + index] = this.stack[this.stack.length-1];
            break;
        case LONG_BINPUT:
            var index = buffer.readUInt32LE(i);
            i+=4;
            this.memo['' + index] = this.stack[this.stack.length-1];
            break;
        case BINGET:
            var index = buffer.readUInt8(i++);
            this.stack.push(this.memo['' + index]);
            break;
        case MARK:
            this.stack.push(this.mark);
            break;
        case SHORT_BINSTRING:
            var length = buffer.readUInt8(i++);
            this.stack.push(buffer.toString('binary', i, i + length));
            i += length;
            break;
        case BINUNICODE: 
            var length = buffer.readUInt32LE(i);
            i += 4;
            this.stack.push(buffer.toString('utf8', i, i + length));
            i += length;
            break;
        case APPEND:
            var value = this.stack.pop();
            this.stack[this.stack.length-1].push(value);
            break;
        case SETITEMS:
            var mark = this.marker()
              , obj = this.stack[mark - 1];
            for (var pos = mark + 1; pos < this.stack.length; pos += 2) {
                obj[this.stack[pos]] = this.stack[pos + 1];
            }
            this.stack = this.stack.slice(0, mark);
            break;
        case STOP:
            return this.stack.pop();
        default:
            throw "Unhandled opcode '" + opcode + "' at " + opindex;
        }
    }
};

Parser.prototype.marker = function(parser) {
    var k = this.stack.length - 1
    while (k > 0 && this.stack[k] !== this.mark) {
        --k;
    }
    return k;
};

Pickle.loads = function(data) {
    var parser = new Parser();
    return parser.load(data);
};


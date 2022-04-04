echo "// StringView.js - BSD-3-Clause licensed code contained in 'rpaDeps/StringView.js' is Copyright (c) 2014, StrangelyTyped" > rpa.js
cat rpaDeps/StringView.js | /usr/local/bin/uglifyjs >> rpa.js

echo "" >> rpa.js
echo "// zlib.js - MIT licensed code contained in 'rpaDeps/zlib.min.js' is Copyright (c) 2012 imaya" >> rpa.js
cat rpaDeps/zlib.min.js | /usr/local/bin/uglifyjs >> rpa.js

echo "" >> rpa.js
echo "// buffer.js - MIT licensed code contained in 'rpaDeps/buffer.js' is Copyright (c) Feross Aboukhadijeh, and other contributors" >> rpa.js
cat rpaDeps/buffer.js | /usr/local/bin/uglifyjs >> rpa.js

echo "" >> rpa.js
echo "// pickle.js - code contained in 'rpaDeps/pickle.js' is modified from MIT licensed code which is Copyright (c) 2013 Jeremy Lainé" >> rpa.js
cat rpaDeps/pickle.js | /usr/local/bin/uglifyjs >> rpa.js

echo "" >> rpa.js
echo "" >> rpa.js
echo "// RpaArchive.js " >> rpa.js
cat RpaArchive.js | /usr/local/bin/uglifyjs >> rpa.js

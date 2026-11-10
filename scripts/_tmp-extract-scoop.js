const fs = require('fs');
const h = fs.readFileSync('public/scoop/index.html', 'utf8');
const parts = h.split('<script>');
const last = parts[parts.length - 1].split('</script>')[0];
fs.writeFileSync('scripts/_tmp-scoop-check.js', last);

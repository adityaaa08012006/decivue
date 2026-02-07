
const http = require('http');

http.get('http://localhost:3001/api/timeline', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${data.substring(0, 100)}...`);
    });
}).on('error', (err) => {
    console.log(`ERROR: ${err.message}`);
});

const http = require('http');

http.get('http://localhost:5001/api/auth/login?email=test@test.com&password=password', (res) => {
  console.log("We need auth token to call /api/patient-config");
});

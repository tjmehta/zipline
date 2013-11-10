var id = module.exports = require('short-id');
id.configure({
  length: 6,          // The length of the id strings to generate
  algorithm: 'sha1',  // The hashing algoritm to use in generating keys
  salt: Math.random   // A salt value or function
});
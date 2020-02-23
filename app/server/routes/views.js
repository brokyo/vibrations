var express = require('express');
var router = express.Router();
var path = require('path');
const fs = require('fs');

router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../../client/views/index.html'));
});

router.get('/configure', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../../client/views/hue_setup.html'));
});

router.get('/play', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../../client/views/play.html'));
});


module.exports = router;

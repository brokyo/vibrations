var express = require('express');
var router = express.Router();
var path = require('path');
const fs = require('fs');

function isElectron() {
	if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
		return true
	} else {
		return false
	}
}

router.get('/', function(req, res, next) {
	if (isElectron()) {
	  res.sendFile(path.join(__dirname, '../../client/views/index.html'));
	} else {
	  res.sendFile(path.join(__dirname, '../../client/views/play.html'));
	}
});

router.get('/configure', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../../client/views/hue_setup.html'));
});

router.get('/play', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../../client/views/play.html'));
});


module.exports = router;

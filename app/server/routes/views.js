var express = require('express');
var router = express.Router();
var path = require('path');
const fs = require('fs');

let buildRoot = 'build/html'
function isElectron() {
	if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
		return true
	} else {
		return false
	}
}

// router.get('/', function(req, res, next) {
// 	if (isElectron()) {
// 	  res.sendFile(path.join(__dirname, '../../client/views/navigation.html'));
// 	} else {
// 	  res.sendFile(path.join(__dirname, '../../client/views/play.html'));
// 	}
// });

// router.get('/configure', function(req, res, next) {
//   res.sendFile(path.join(__dirname, '../../client/views/hue_setup.html'));
// });

// router.get('/play', function(req, res, next) {
//   res.sendFile(path.join(__dirname, '../../client/views/play.html'));
// });

// WEBPACK REFACTOR //
router.get('/', function(req, res, next) {
	res.sendFile('navigation.html', {root: buildRoot})
})

router.get('/configuration', function(req, res, next) {
	res.sendFile('configuration.html', {root: buildRoot})
})

router.get('/listen', function(req, res, next) {
	res.sendFile('listen.html', {root: buildRoot})
})

module.exports = router;

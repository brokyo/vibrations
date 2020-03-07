var fs = require('fs')
var path = require('path');
var express = require('express');
var router = express.Router();

/* random utterance. */
router.get('/utterance', function(req, res, next) {
	fs.readFile(path.join(__dirname, '../assets/utterances.json'), (err, data) => {
		if (err) {
			res.send(400)
		} else {
			var utterances = JSON.parse(data)

			let randomGroup = Math.floor(Math.random() * utterances.groups.length)
			let randomOption = Math.floor(Math.random() * utterances.groups[randomGroup].options.length)
			let selectedGroup = utterances.groups[randomGroup]
			let selectedOption = selectedGroup.options[randomOption]

			selectedUtterance = {
				prefix: selectedGroup.prefix,
				type: selectedOption.type,
				text: selectedOption.text
			}

			res.send({utterance: selectedUtterance});
		}
	})
});

module.exports = router;

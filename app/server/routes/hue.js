var fs = require('fs')
var path = require('path');
var express = require('express');
var router = express.Router();
const v3 = require('node-hue-api').v3
const discovery = v3.discovery
const hueApi = v3.api
const LightStateBase = require('node-hue-api').v3.lightStates.LightState
var savePath

// TODO: This is a despicable hack to allow this to run in both electron and web
// There's probably a better approach?
if (isElectron()) {
	var storage = require('electron-json-storage')
	savePath = storage.getDataPath() + '/'
} else {
	savePath = 'app/server/assets/'
}

function isElectron() {
	if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
		return true
	} else {
		return false
	}
}

function getCreds() {
	return new Promise((resolve, reject) => {
		fs.readFile(savePath + 'creds.json', (err, data) => {
			if (err) {
				console.log(err)
				reject(err)
			} else {
				let creds = JSON.parse(data)
				resolve(creds)
			}
		})
	})	
}

function createApi(creds) {
	return new Promise((resolve, reject) => {
		hueApi.createLocal(creds.ipAddress).connect(creds.user).then((api, err) => {
			if (err) {
				reject(err)
			} else {
				resolve(api)
			}
		})
	})
}

function getArray() {
	return new Promise((resolve, reject) => {
		fs.readFile(savePath + 'array.json', (err, data) => {
			if (err) {
				reject(err)
			} else {
				resolve(JSON.parse(data).performanceArray)
			}
		})
	})
}


// configuration
router.get('/setup', function(req, res, next) {
	const appName = 'prepare'
	const deviceName = 'local'

	async function discoverBridge() {
		const discoverResults = await discovery.nupnpSearch()

		if (discoverResults.length === 0) {
			console.error('failed to find bridge')
			return null
		} else {
			return discoverResults[0].ipaddress
		}
	}

	async function discoverAndCreateUser() {
		const ipAddress = await discoverBridge()

		const unauthenticatedApi = await hueApi.createLocal(ipAddress).connect()

		let createdUser
		try {
			createdUser = await unauthenticatedApi.users.createUser(appName, deviceName)

			var creds = {	
				ipAddress: ipAddress,
				user: createdUser.username,
				key: createdUser.clientkey
			}

			fs.writeFile(savePath + 'creds.json', JSON.stringify(creds), (err) => {
				if (err) {
					console.log(err)
					res.status(400).send({'type': 'error', 'message': err})
				} else {
					res.status(200).send({'type': 'success'})
				}
			})	

		} catch(err) {
			if (err.getHueErrorType() === 101) {
				res.status(400).send({'type': 'error', 'message': 'The link button was not pressed'})
			} else {
				res.status(400).send({'type': 'error', 'message': err.message})
			}
		}
	}

	discoverAndCreateUser()
});

router.get('/credential_check', function(res, res, next) {
	getCreds().then(data => {
		res.status(200).send({userExists: true})
	}, err => {
		res.status(200).send({userExists: false})
	})
})

router.get('/get_lights', function(req, res, next) {
	getCreds().then(creds => {
		createApi(creds).then(api => {
			return api.lights.getAll()
		}).then(lights => {
			console.log(`${lights.length} lights found`)
			res.status(200).send({'lightArray': lights})
		})
	})
})

router.post('/test_light', function(req, res, next) {
	getCreds().then(creds => {
		createApi(creds).then(api => {
			let newState = new LightStateBase()

			newState.alertShort()
			api.lights.setLightState(req.body.lightId, newState)

			res.sendStatus(200)
		})
	})
})

router.post('/save_array', function(req, res, next) {
	var saveData = '{"performanceArray": ' + JSON.stringify(req.body.array) + '}'

	fs.writeFile(savePath + 'array.json', saveData, (err) => {
		if (err) {
			res.status(400).send(err)
		} else {
			res.status(200).send()
		}
	})
})

// Playback
router.get('/reset_lights', function(req, res, next) {
	getCreds().then(creds => {
		createApi(creds).then(api => {
			getArray().then(array => {
				let newState = new LightStateBase()
				newState.off()

				array.forEach(light => {
					api.lights.setLightState(light.id, newState)
				})
				res.sendStatus(200)
			})
		})
	})
})

router.post('/attack', function(req, res, next) {
	var colorConfig = req.body
	getCreds().then(creds => {
		createApi(creds).then(api => {
			let newState = new LightStateBase()

			newState.on().hue(colorConfig.h * 182.0416).brightness(colorConfig.b).saturation(colorConfig.s).transition(colorConfig.duration * 1000)

			api.lights.setLightState(colorConfig.lightId, newState)
			res.sendStatus(200)
		})
	})
})

router.post('/release', function(req, res, next) {
	var config = req.body
	getCreds().then(creds => {
		createApi(creds).then(api => {
			let newState = new LightStateBase()

			newState.on().hue(config.h * 182.0416).saturation(config.s).brightness(config.v).transition(config.duration * 1000)

			api.lights.setLightState(config.lightId, newState)
			res.sendStatus(200)
		})
	})
})

router.get('/get_array', function(res, res, next) {
	getArray().then(array => {
		if ( array.length === 0 ) {
			res.send({'hueActive': false, 'array': array})
		} else {
			res.send({'hueActive': true, 'array': array})
		}
	}, err => {
		res.send({'hueActive': false, 'array': []})		
	})
})

router.post('/wave_end', function(res, res, next) {
	getCreds().then(creds => {
		createApi(creds).then(api => {
			getArray().then(array => {
				let endState = new LightStateBase
				endState.off()

				array.forEach(light => {
					api.lights.setLightState(light.id, endState)
				})
				res.status(200).send()
			})
		})
	})
})


module.exports = router;

////////////////////////////////////
// **** TIMBRE CONFIGURATION **** //
////////////////////////////////////
var roomConfig = {
	reverb: {
		roomSize: 0.7,
		dampening: 3000
	},
	tremolo: {
		frequency: 10,
		type: 'sine',
		depth: 0.5,
		spread: 180
	},
	delay: {
		delayTime: 0.25
	}
}
var baseSynthConfig = { 
	synth: {
		oscillator: {
			partials: [ 0.615, 0.29, 0.155, 0.03, 0.065, 0.83, 0, 0, 0 ]
		},
		envelope: { 
			attack: 2.0, 
			attackCurve: 'linear', 
			decay: 0.1, 
			release: 8, 
			releaseCurve: 'ripple', 
			sustain: 0.4 
		}
	}, 
	tremolo: { 
		depth: 0.3, 
		frequency: 3.1, 
		spread: 180, 
		type: 'sine', 
		wet: 0 
	}, 
	vibrato: { 
		depth: 0.1, 
		frequency: 3.1, 
		maxDelay: 0.005, 
		type: 'sine', 
		wet: 0.3 
	}, 
	phaser: { 
		Q: 10, 
		baseFrequency: 669, 
		frequency: 0.8, 
		octaves: 3, 
		stages: 10, 
		wet: 0.4 
	}, 
	feedbackDelay: { 
		delayTime: 0.55, 
		feedback: 0.2, 
		wet: 0.3 
	}, 
	chorus: { 
		delayTime: 2.1, 
		depth: 0.4, 
		feedback: 0.1, 
		frequency: 0.85, 
		spread: 67, 
		type: 'sine', 
		wet: 0.1 
	}, 
	EQ3: { 
		high: -16, 
		mid: -17,
		low: -14 
	},
	widener: {
		width: 0.8
	},
	panner: {
		frequency: 1, 
		type: 'sine', 
		depth: 0.5
	},
	out: {
		gain: 0.5
	},
}
var baseSynthFollowerConfig = {
	triggerChance: 0.9,
	duration: {
		min: 10,
		max: 30
	},
	velocity: {
		min: 0.05,
		max: 0.3
	}
}
var voiceConfig = {
	portamento: 0.2,
	osc: {
		type: 'pulse',
		width: 0.7,
		detuneMin: -10,
		detuneMax: 10
	},
	env: {
		attackCurve: 'linear',
		decayCurve: 'linear',
		releaseCurve: 'linear'
	},
	noise: {
		playbackRate: 0.7,
		volume: -10
	},
	voxOut: {
		gain: 0.2
	},
	lineOut: {
		gain: 0.4
	}
}
var voiceEventConfig = {
	velocity: {
		min: 0.3,
		max: 0.8
	},
	attack: {
		min: 0.5,
		max: 3
	},
	sustain: {
		min: 5,
		max: 8
	},
	release: {
		min: 10,
		max: 18
	},
	rest: {
		min: 6,
		max: 18
	}
}

//////////////////////////////////
// **** WAVE CONFIGURATION **** //
/////////////////////////////////
var fps = 30
var utteranceChangeChance = 1.0
var formantChangeChance = 1.0
var tonicChangeChance = 1.0
var notesInWave = 6
var possibleTonics = ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2']
var newWaveConfig = {
	startShift: {
		min: 1,
		max: 6
	},
	waveRest: 15
}


//////////////////////////
// **** BEGIN CODE **** //
//////////////////////////

// ** Initialize Variables ** //
var timeline = new Tone.Timeline()
var sections = new Array()
var lightArray = new Array()
var possibleNotes = new Array()
var possibleChords = new Array()
var baseSynth = new Object()
var room = new Object()
let utterance = new Object()
var hueIntegration = false
var waveCount = 0

// ** Instrument Classes ** //
// `BaseSynth` is the underlying drone. It's a polysynth made up one one complex
// waveform and a bunch of effects
class BaseSynth {
	constructor() {
		this.color = {
			web: {h: 0, s: 0, v: 0},
			hue: {h: 0, s: 0, v: 0}
		}
		this.synth = new Tone.PolySynth(10, Tone.Synth) 
		this.synth.set(baseSynthConfig.synth)
		this.tremolo = new Tone.Tremolo(baseSynthConfig.tremolo)
		this.vibrato = new Tone.Vibrato(baseSynthConfig.vibrato)
		this.phaser = new Tone.Phaser(baseSynthConfig.phaser)
		this.feedbackDelay = new Tone.FeedbackDelay(baseSynthConfig.feedbackDelay)
		this.chorus = new Tone.Chorus(baseSynthConfig.chorus)
		this.EQ3 = new Tone.EQ3(baseSynthConfig.EQ3)
		this.widener = new Tone.StereoWidener(baseSynthConfig.widener)
		this.panner = new Tone.AutoPanner(baseSynthConfig.panner)
		this.out = new Tone.Gain(baseSynthConfig.out)

		this.synth.chain(this.tremolo, this.vibrato, this.phaser, this.feedbackDelay, this.chorus, this.EQ3, this.widener, this.panner, this.out)
	}
}

// `ChorirSection`s are objects that contain the individual Tone voices, and 
// the color metadata for p5 and Hue.
class ChoirSection {
  constructor(config = {id: null, oscCount: 15, position: 0}) {
	///////////////
	// UNIVERSAL //
	///////////////
	this.id = config.id
	this.active = false

	///////////
	// COLOR //
	///////////
	this.color = {
		changing: false,
		start: {h:0, s:0, v:0},
		end: {h:0, s:0, v:0},
		current: {h:0, s:0, v:0},
		iterator: 0,
		iteratorStep: 0.033
	}

	///////////
	// VOICE //
	///////////
	this.voice = {}
	this.voice.portamento = voiceConfig.portamento

	// -- VOX -- //
	this.voice.voxOut = new Tone.Gain(voiceConfig.voxOut.gain)

	this.voice.oscs = _.times(config.oscCount, function() {
		return new Tone.OmniOscillator({
	        type: voiceConfig.osc.type,
	        width: voiceConfig.osc.width,
	        detune: _.random(voiceConfig.osc.detuneMin, voiceConfig.osc.detuneMax)
		}).start()
	})

	this.voice.envs = _.times(config.oscCount, function() {
		return new Tone.AmplitudeEnvelope({
			attackCurve: voiceConfig.env.attackCurve,
			decayCurve: voiceConfig.env.decayCurve,
			releaseCurve:  voiceConfig.env.releaseCurve
	  })
	})

	this.voice.oscs.forEach((osc, index) => osc.connect(this.voice.envs[index]))
	this.voice.envs.forEach((env, index) => env.connect(this.voice.voxOut))

	// -- WHITE NOISE -- //
	this.voice.noise = new Tone.Noise({
	  playbackRate: voiceConfig.noise.playbackRate,
	  volume: voiceConfig.noise.volume
	}).start()

	this.voice.noise.connect(this.voice.envs[0])


	// -- FORMANTS -- //
	this.voice.formantOut = new Tone.Gain()

	this.voice.lfoNodes = _.times(5, function() {
		return new Tone.LFO({
			type: 'sine',
			min: 0,
			max: 1,
			phase: 0,
			frequency: '4n',
			amplitude: 1
		}).start()
	})

	this.voice.formantNodes = _.times(5, function(index) {
		return new Tone.Filter({
			type: 'bandpass',
			rolloff: -24
		})
	})

	// // connect each lfo node to its corresonding formant to oscillate filter frequency
	this.voice.lfoNodes.forEach((lfoNode, index) => {
		lfoNode.connect(this.voice.formantNodes[index].frequency)	
	})

	this.voice.volumeNodes = _.times(5, function() {
		return new Tone.Volume()
	})

	// fan voxOut signal across formant chains to formantOut where it's recombined
	for (let i = 0; i < 5; i++) {
		this.voice.voxOut.chain(this.voice.formantNodes[i], this.voice.volumeNodes[i], this.voice.formantOut)
	}


	// -- EFFECTS -- //
	this.voice.position = new Tone.Panner(config.position)
	this.voice.lineOut = new Tone.Gain(voiceConfig.lineOut.gain)

	this.voice.formantOut.chain(this.voice.position, this.voice.lineOut)
  }

  start() {
	this.active = true;
  }

  stop() {
	this.active = false
  }

  changeFormant(index) {
	var vocalizationConfig = FormantPresets[index].formants

	vocalizationConfig.forEach((config, index) => {
		this.voice.formantNodes[index].set({
			frequency: config.frequency,
			Q: config.frequency / config.bw,
		})

		this.voice.volumeNodes[index].set({
			volume: config.volume
		})
	})
  }
}


/** 
	TODO: Tone's `Timeline` is a timeline of events that can be manipulated.
	It contains attack and release events that trigger changes in p5, tone,
	and hue. Because of this the logic for all three of those libraries is
	contained below. This is annoying and I bet has performance implications 
	but I don't know how to otherwise use the Timeline object across scripts 
	without a bus?
**/

// ** Scheduling Logic ** //

//** New Wave Helpers **//
function changeScale(tonic) {
	let key = Tonal.Key.minorKey(tonic).natural

	let lowerNotes = []
	let higherNotes = []
	for (let i = 0; i < 4; i++) {
		let noteBelow = Tonal.Tonal.transpose(key.scale[i + 3], '-8P')
		let noteAbove = Tonal.Tonal.transpose(key.scale[i], '8P')
		lowerNotes.push(noteBelow)
		higherNotes.push(noteAbove)
	}

	possibleNotes = lowerNotes.concat(key.scale).concat(higherNotes)
	possibleChords = key.chords
}
function getNoteConfig() {
	// Picks note and colors from current possibilities
	let nextNote = Tone.Frequency(_.sample(possibleNotes))
	let nextColor = _.find(ColorMap, {note: nextNote._val.slice(0, -1)})
	let velocity = _.random(voiceEventConfig.velocity.min, voiceEventConfig.velocity.max)

	return {
		name: nextNote._val,
		frequency: nextNote.toFrequency(),
		webColor: nextColor.webColor,
		hueColor: nextColor.hueColor,
		velocity: velocity 
	}
}
function getNewUtterance() {
	fetch('/resources/utterance')
		.then(res => res.json())
		.then(selected => {
			utterance = selected.utterance
		})
}

//** Hue Scheduling Helpers **//
function hueAttack(id, finalColor, attackTime) {
	let colorConfig = {
		lightId: id,
		h: finalColor.h,
		s: finalColor.s,
		b: finalColor.v,
		duration: attackTime
	}

	fetch('hue/attack', {
		method: 'POST',
        headers: {'Content-Type':'application/json'},
		body: JSON.stringify(colorConfig)
	})
}
function hueRelease(id, finalColor, releaseTime) {
	let postData = {
		lightId: id,
		h: finalColor.h,
		s: finalColor.s,
		v: finalColor.v,
		duration: releaseTime
	}

	fetch('hue/release', {
		method: 'POST',
        headers: {'Content-Type':'application/json'},
		body: JSON.stringify(postData)
	})
}

//** Event Scheduling Helpers **//
function generateEventTimes() {
	return {
		attack: _.random(voiceEventConfig.attack.min, voiceEventConfig.attack.max),
		sustain: _.random(voiceEventConfig.sustain.min, voiceEventConfig.sustain.max),
		release: _.random(voiceEventConfig.release.min, voiceEventConfig.release.max),
		rest: _.random(voiceEventConfig.rest.min, voiceEventConfig.rest.max)
	}
}
function createAttackEvent(sectionIndex, noteConfig, eventTimes, startShift) {

	// an attackEvent object triggers changes in music in Tone, and color in
	// p5, and Hue
	var attackEvent = new Tone.Event(time => {

		// Tone Event
		// Changes the oscillator value (note) and attackEnvelope to their new, random values
		// then trigger it at a random velocity
		sections[sectionIndex].voice.oscs.forEach(osc => {
			osc.frequency.linearRampToValueAtTime(noteConfig.frequency, time + sections[sectionIndex].voice.portamento)
		})

		sections[sectionIndex].voice.envs.forEach(env => {
			env.set({attack: eventTimes.attack, release: eventTimes.release})
			env.triggerAttack('+0', noteConfig.velocity)
		})

		if (Math.random() > 1 - baseSynthFollowerConfig.triggerChance) {
			triggerBaseSynth(noteConfig.frequency)
		}

		// P5 Event
		// Sets base parameters for the next note's coloration 
		sections[sectionIndex].color.changing = true
		sections[sectionIndex].color.start = sections[sectionIndex].color.current
		sections[sectionIndex].color.end = noteConfig.webColor
		sections[sectionIndex].color.iteratorStep = 1 / (eventTimes.attack * fps)

		// Hue Event
		// Triggers call to backend to handle Hue color changes
		if (hueIntegration) {
			hueAttack(sections[sectionIndex].id, noteConfig.hueColor, eventTimes.attack)
		}

	})

	// Add metadata to event
	attackEvent.type = 'attack'
	attackEvent.time = 0
	attackEvent.note = noteConfig.frequency
	attackEvent.section = sectionIndex

	// Set the start time (current time + accumulated shift) 
	// and add it to the timeline
	attackEvent.start(Tone.Time().now() + startShift)

	return attackEvent
} 
function createReleaseEvent(sectionIndex, eventTimes, startShift) {

	// an releaseEvent object triggers changes in Tone, p5, and Hue and is
	// scheduled along the timeline in advance
	var releaseEvent = new Tone.Event(time => {		
		// Tone Event
		sections[sectionIndex].voice.envs.forEach(env => {
			env.triggerRelease()
		})

		// P5 Event
		// confirms color is off at end
		sections[sectionIndex].color.changing = true
		sections[sectionIndex].color.start = sections[sectionIndex].color.current
		sections[sectionIndex].color.end = baseSynth.color.web
		sections[sectionIndex].color.iteratorStep = 1 / (eventTimes.release * 30)

		// Hue Event
		// Triggers call to backend to handle Hue color changes
		if (hueIntegration) {
			hueRelease(sections[sectionIndex].id, baseSynth.color.hue, eventTimes.release)
		}
  })

  // Add metadata to event
  releaseEvent.time = 0
  releaseEvent.type = 'release'
  releaseEvent.section = sectionIndex

  // Set the start time and add it to the timeline
  releaseEvent.start(Tone.Time().now() + startShift)
  return releaseEvent
} 
function createCompletedEvent(sectionIndex, startShift) {
	// An end event is just a failsafe to make sure events have properly ended
	// and prevent weird timing bugs
	var endEvent = new Tone.Event(time => {
		sections[sectionIndex].active = false

		completed(startShift)
	})

	// Add metadata to the event
	endEvent.time = 0
	endEvent.type = 'voice_end'
	endEvent.section = sectionIndex

	// Set the start time and add it to the timeline 
	endEvent.start(Tone.Time().now() + startShift)

	return endEvent
}
function scheduleEvents(sectionIndex) {
	let startShift = _.random(newWaveConfig.startShift.min, newWaveConfig.startShift.max)

	// Schedule notes and their affect on light and sound
	for (let i = 0; i < notesInWave; i++) {
		let noteConfig = getNoteConfig()
		let eventTimes = generateEventTimes()

		let attackEvent = createAttackEvent(sectionIndex, noteConfig, eventTimes, startShift)
		timeline.add(attackEvent)
		startShift += eventTimes.attack + eventTimes.sustain

		let releaseEvent = createReleaseEvent(sectionIndex, eventTimes, startShift)
		timeline.add(releaseEvent)
		startShift += eventTimes.release + eventTimes.rest
	}

	// At the end schedule a wave completed event
	var completedEvent = createCompletedEvent(sectionIndex, startShift)
	timeline.add(completedEvent)
}
function completed(startShift) {
	let finishedSections = _.filter(sections, {active: false})
	
	if (finishedSections.length === 4) {

		let releaseEvent = new Tone.Event(time => {
			baseSynth.synth.releaseAll()
		})
		let startShift = 0
		releaseEvent.time = startShift
		releaseEvent.start(Tone.Time().now() + startShift)
		releaseEvent.section = 'base'
		timeline.add(releaseEvent)

		let waveEnd = new Tone.Event(time => {
			endWave()
		})
		startShift += baseSynthConfig.synth.envelope.release + 5
		waveEnd.time = 0
		waveEnd.start(Tone.Time().now() + startShift)
		waveEnd.section = 'base'
		timeline.add(waveEnd)

		let newWaveEvent = new Tone.Event(time => {
			newWave()
		})
		startShift += newWaveConfig.waveRest
		newWaveEvent.time = 0
		newWaveEvent.start(Tone.Time().now() + startShift)
		newWaveEvent.section = 'base'
		timeline.add(newWaveEvent)
	}
}
function newWave() {
	getNewUtterance()

	let randomFormant = _.random(0, FormantPresets.length - 1)
	let formantName = FormantPresets[randomFormant].name
	sections.forEach(section => section.changeFormant(randomFormant))

	let tonic = _.sample(possibleTonics)
	changeScale(tonic)

	console.log('New Wave | Tonic:', tonic, 'Formant:', formantName)

	baseSynth.synth.triggerAttack(tonic)

	let nextColor = _.find(ColorMap, {note: tonic.slice(0, -1)})
	baseSynth.color.web = {h: nextColor.webColor.h, s: nextColor.webColor.s, v: 0.15}
	baseSynth.color.hue = nextColor.hueColor
	baseSynth.color.hue.v = 0

	for (let i = 0; i < sections.length; i++) {
		sections[i].active = true;
		sections[i].color.iteratorStep = 1 / (baseSynthConfig.synth.envelope.attack * fps)
		sections[i].color.start = '#000000'
		sections[i].color.end = baseSynth.color.web
		sections[i].color.changing = true;
		scheduleEvents(i)
	}
	waveCount++
}
function endWave() {
	sections.forEach(section => {
		section.color.changing = true
		section.color.start = section.color.current
		section.color.end = {h: 0, s: 0, v: 0}

	})

	fetch('hue/wave_end', {
		method: 'POST',
        headers: {'Content-Type':'application/json'},
		body: JSON.stringify()
	})

	utterance.type = 'card'
	utterance.text = 'awakening systems'
}
function triggerBaseSynth(note) {
	let duration = _.random(baseSynthFollowerConfig.duration.min, baseSynthFollowerConfig.duration.max)
	let velocity = _.random(baseSynthFollowerConfig.velocity.min, baseSynthFollowerConfig.velocity.max, true)
	baseSynth.synth.triggerAttackRelease(duration, note, undefined, velocity)
}

//** Init Libraries **//
// Tone //
function initTone() {
	Tone.Master.set({volume: -100})

	if(hueIntegration) {
		sections = _.times(4, (i) => {return new ChoirSection({id: lightArray[i].id, oscCount: 10, position: lightArray[i].position})})

	} else {
		let sectionPositions = [-1, -0.5, 0.5, 1]
		sections = _.times(4, (i) => {return new ChoirSection({id: null, oscCount: 10, position: sectionPositions[i]})
		})
	}


	room.in = new Tone.Gain()
	room.reverb = new Tone.Freeverb(roomConfig.reverb)
	room.tremolo = new Tone.Tremolo(roomConfig.tremolo)
	room.delay = new Tone.PingPongDelay(roomConfig.delay)

	room.in.chain(room.reverb, room.tremolo, room.delay, Tone.Master)


	baseSynth = new BaseSynth()

	baseSynth.out.connect(room.in)

	sections.forEach(section => {
		section.voice.lineOut.connect(room.in)
	})
}
function startPlayback() {
	Tone.Transport.start()
	newWave()
}

// P5 //
function preload() {
	font = loadFont('assets/Abel-Regular.ttf')
}
function setup() {
	colorMode(HSB)
	var canvas = createCanvas(windowWidth, windowHeight)
	canvas.parent('canvas-holder');
	frameRate(30)
}
function draw() {
	sections.forEach(section => {
		if(section.color.changing) {
			section.color.iterator += section.color.iteratorStep
			section.color.current = chroma.mix(chroma(section.color.start), chroma(section.color.end), section.color.iterator, 'hsv')

			if (section.color.iterator >= 1) {
				section.color.changing = false
				section.color.iterator = 0
			}
		}					
	})

	let colors = [sections[0].color.current, sections[1].color.current, sections[2].color.current, sections[3].color.current];

	let average = chroma.average(colors).hex()
	background(average)

	textFont(font)
	fill(255)

	textAlign(CENTER)
	if (utterance.type === 'short') {
		textSize(45)
		text(utterance.text, windowWidth / 2, windowHeight / 3)
	} else if (utterance.type === 'long') {
		textSize(40)
		text(utterance.text, windowWidth * 0.25, windowHeight * 0.1, windowWidth / 2)
	} else if (utterance.type === 'card') {
		textSize(65)
		text(utterance.text, windowWidth / 2, windowHeight / 2)
	} 

	textSize(20)
	text('prepare.awakening.systems', windowWidth / 2, windowHeight - 40)
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


// ** DOM Stuff ** //
var aboutBanner = document.getElementById('about-banner')
var startButton = document.getElementById('start-button')
startButton.addEventListener("click", e => {
	Tone.Master.set({volume: 0})
	startButton.style.display = 'none'
	aboutBanner.style.display = 'none'
	startPlayback()
})
var screenshotButton = document.getElementById('screenshot-button')
screenshotButton.addEventListener("click", e => {
	saveImage()
})
var infoButton = document.getElementById('info-button')
infoButton.addEventListener("click", e => {
	window.open('https://github.com/brokyo/prepare', '_blank')
})
var fullscreenButton = document.getElementById('fullscreen-button')
fullscreenButton.addEventListener("click", e => {
	toggleFullScreen()
})
var logo = document.getElementById('logo')
logo.addEventListener("click", e => {
	window.open('https://awakening.systems', '_blank')
})
function toggleFullScreen() {
  if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen(); 
    }
  }
}
function saveImage() {
	saveCanvas('please_remember' + Date.now(), 'png')
}
function hover(element) {
  element.setAttribute('src', 'assets/as_text.svg');
}
function unhover(element) {
  element.setAttribute('src', 'assets/as.svg');
}
function checkForHueAndBegin() {
	fetch('/hue/get_array').then(response => {
		return response.json()
	}).then(response => {
		if(response.hueActive) {
			lightArray = response.array
			console.log('lightArray:', lightArray)
			hueIntegration = true
		} else {
			lightArray = []
			hueIntegration = false
		}

		if (hueIntegration) {
			fetch('/hue/reset_lights')
		}

		console.log('hueIntegration:', hueIntegration)

		initTone()
	})
}

checkForHueAndBegin()
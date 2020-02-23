/** 
	TODO: Tone's `Timeline` is a timeline of events that can be manipulated.
	It contains attack and release events that trigger changes in p5, tone,
	and hue. Because of this the logic for all three of those libraries is
	contained in this script. This has annoying and I bet has performance 
	implications but I don't know how to otherwise use the Timeline object
	across scripts. Is there a better way to do this?
**/

// Global Variables
var sections = new Array()
var timeline = new Tone.Timeline()
var lightArray = []
var waveCount = 0
var hueIntegration = false

// Change Variables
var utteranceChangeChance = 1.0
var formantChangeChance = 0.5
var tonicChangeChance = 0.5
var notesInWave = 5

// Tone Variables
var tonic = 'E2'
var possibleTonics = ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2']
var possibleNotes = []
var possibleChords = []
var baseSynth = {}
var room = {}

// P5 Variables
let utterance = {
	length: '',
	text: ''
}


class BaseSynth {
	constructor() {
		var config = { 
			synth: {oscillator: {partials: [ 0.615, 0.29, 0.155, 0.03, 0.065, 0.83, 0, 0, 0 ]},
			envelope: { "attack": 2.0, "attackCurve": "linear", "decay": 0.1, "release": 8, "releaseCurve": "ripple", "sustain": 0.4 }}, 
			tremolo: { "depth": 0.3, "frequency": 3.1, "spread": 180, "type": "sine", "wet": 0 }, 
			vibrato: { "depth": 0.1, "frequency": 3.1, "maxDelay": 0.005, "type": "sine", "wet": 0.3 }, 
			phaser: { "Q": 10, "baseFrequency": 669, "frequency": 0.8, "octaves": 3, "stages": 10, "wet": 0.4 }, 
			feedbackDelay: { "delayTime": 0.55, "feedback": 0.2, "wet": 0.3 }, 
			chorus: { "delayTime": 2.1, "depth": 0.4, "feedback": 0.1, "frequency": 0.85, "spread": 67, "type": "sine", "wet": 0.1 }, 
			EQ3: { "high": "-16", "low": "-14", "mid": "-17" },
			widener: {"width": 0.8},
			panner: {"frequency": 1, "type": "sine", "dept": 0.5},
			out: {gain: 0.5}
		}


		this.color = {
			web: {h: 0, s: 0, v: 0},
			hue: {h: 0, s: 0, v: 0}
		}
		this.synth = new Tone.PolySynth(10, Tone.Synth) 
		this.synth.set(config.synth)
		this.tremolo = new Tone.Tremolo(config.tremolo)
		this.vibrato = new Tone.Vibrato(config.vibrato)
		this.phaser = new Tone.Phaser(config.phaser)
		this.feedbackDelay = new Tone.FeedbackDelay(config.feedbackDelay)
		this.chorus = new Tone.Chorus(config.chorus)
		this.EQ3 = new Tone.EQ3(config.EQ3)
		this.widener = new Tone.StereoWidener(config.widener)
		this.panner = new Tone.AutoPanner(config.panner)
		this.out = new Tone.Gain(config.out)

		this.synth.chain(this.tremolo, this.vibrato, this.phaser, this.feedbackDelay, this.chorus, this.EQ3, this.out)
	}
}

// `ChorirSection`s are objects that contain the Tone.js synth patch,
// the values of that patch, and instructions shared color values of p5/Hue.
// They are literally the things making sound
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
		start: chroma({h:0, s:0, v:0}),
		end: chroma({h:0, s:0, v:0}),
		current: chroma({h:0, s:0, v:0}),
		iterator: 0,
		iteratorStep: 0.033
	}



	///////////
	// VOICE //
	///////////
	this.voice = {}
	this.voice.portamento = 0.2

	// -- VOX -- //
	this.voice.voxOut = new Tone.Gain(0.2)

	this.voice.oscs = _.times(config.oscCount, function() {
		return new Tone.OmniOscillator({
	        type: 'pulse',
	        width: 0.7,
	        detune: _.random(-10, 10)
		}).start()
	})


	this.voice.envs = _.times(config.oscCount, function() {
		return new Tone.AmplitudeEnvelope({
			attackCurve: 'linear',
			decayCurve: 'linear',
			releaseCurve: 'linear'
	  })
	})

	this.voice.oscs.forEach((osc, index) => osc.connect(this.voice.envs[index]))
	this.voice.envs.forEach((env, index) => env.connect(this.voice.voxOut))

	// -- WHITE NOISE -- //
	this.voice.noise = new Tone.Noise({
	  playbackRate: 0.7,
	  volume: -10
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
	this.voice.lineOut = new Tone.Gain(0.4)

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

//** Hue Helpers **//
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
	let velocity = _.random(0.3, 0.8)

	return {
		name: nextNote._val,
		frequency: nextNote.toFrequency(),
		color: nextColor.color,
		hue: nextColor.hueColor,
		velocity: velocity 
	}
}
function generateEventTimes() {
	// Generate random event and envelope times
	return {
		attack: _.random(0.5, 2),
		sustain: _.random(5, 8),
		release: _.random(10, 18),
		rest: _.random(6, 18)
	}
}

//** P5 Helpers **//
function getNewUtterance() {
	fetch('/resources/utterance')
		.then(res => res.json())
		.then(selected => {
			utterance = selected.utterance
		})
}

//** Event Scheduling Functions **//
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
			env.triggerAttack("+0.1", noteConfig.velocity)
		})

		if (Math.random() > 0.9) {
			triggerBaseSynth(noteConfig.frequency)
		}

		// P5 Event
		// Sets base parameters for the next note's coloration 
		sections[sectionIndex].color.changing = true
		sections[sectionIndex].color.start = sections[sectionIndex].color.current
		sections[sectionIndex].color.end = chroma(noteConfig.color)
		sections[sectionIndex].color.iteratorStep = 1 / (eventTimes.attack * 30)

		// Hue Event
		// Triggers call to backend to handle Hue color changes
		if (hueIntegration) {
			hueAttack(sections[sectionIndex].id, noteConfig.hue, eventTimes.attack)
		}

	})

	// Add metadata to event
	attackEvent.type = 'attack'
	attackEvent.time = startShift
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
		// console.log('release', 'section:', sectionIndex)
		
		// Tone Event
		sections[sectionIndex].voice.envs.forEach(env => {
			env.triggerRelease()
		})

		// P5 Event
		// confirms color is off at end
		sections[sectionIndex].color.changing = true
		sections[sectionIndex].color.start = sections[sectionIndex].color.current
		sections[sectionIndex].color.end = chroma({h: baseSynth.color.web.h, s: baseSynth.color.web.s, v: 0.2})
		sections[sectionIndex].color.iteratorStep = 1 / (eventTimes.release * 30)

		// Hue Event
		// Triggers call to backend to handle Hue color changes
		if (hueIntegration) {
			hueRelease(sections[sectionIndex].id, baseSynth.color.hue, eventTimes.release)
		}
  })

  // Add metadata to event
  releaseEvent.time = startShift
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
	endEvent.time = startShift
	endEvent.type = 'voice_end'
	endEvent.section = sectionIndex

	// Set the start time and add it to the timeline [add 10 to force brief pause]
	endEvent.start(Tone.Time().now() + startShift)

	return endEvent
}
function scheduleEvents(sectionIndex) {
	let startShift = _.random(1, 10)

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
			sections.forEach(section => {
				section.color.end = chroma({h: 0, s: 0, v: 0})
			})
		})

		releaseEvent.time = 0
		releaseEvent.start(Tone.Time().now())
		releaseEvent.type = 'wave_end'
		releaseEvent.section = 'base'

		timeline.add(releaseEvent)

		let newWaveEvent = new Tone.Event(time => {
			newWave()
		})

		newWaveEvent.time = 15
		newWaveEvent.start(Tone.Time().now() + 15)
	}
}

function newWave() {
	console.log('new wave')
	if (waveCount === 0) {
		getNewUtterance()
		changeScale(tonic)
		sections.forEach(section => section.changeFormant(0))
	} else {
		if (Math.random() > 1 - utteranceChangeChance) {
			getNewUtterance()
		}

		if (Math.random() > 1 - formantChangeChance) {
			let randomFormant = _.random(0, FormantPresets.length - 1)
			sections.forEach(section => section.changeFormant(randomFormant))
		}

		if (Math.random() > 1 - tonicChangeChance) {
			tonic = _.sample(possibleTonics)
			changeScale(tonic)
		}		if (Math.random() > 1 - utteranceChangeChance) {
			getNewUtterance()
		}

		if (Math.random() > 1 - formantChangeChance) {
			let randomFormant = _.random(0, FormantPresets.length - 1)
			sections.forEach(section => section.changeFormant(randomFormant))
		}

		if (Math.random() > 1 - tonicChangeChance) {
			tonic = _.sample(possibleTonics)
			changeScale(tonic)
		}
	}

	baseSynth.synth.triggerAttack(tonic)

	let nextColor = _.find(ColorMap, {note: tonic.slice(0, -1)})
	baseSynth.color.web = nextColor.color
	baseSynth.color.web.v = 1
	baseSynth.color.hue = nextColor.hueColor
	baseSynth.color.hue.v = 1

	console.log(baseSynth.color)

	for (let i = 0; i < sections.length; i++) {
		sections[i].active = true;
		scheduleEvents(i)
	}
	waveCount++
}

function triggerBaseSynth(note) {
	let duration = _.random(10, 30)
	let velocity = _.random(0.05, 0.3, true)
	baseSynth.synth.triggerAttackRelease(duration, note, undefined, velocity)
}

//** Init Libraries **//
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
	room.reverb = new Tone.Freeverb()
	room.tremolo = new Tone.Tremolo()

	room.in.chain(room.reverb, room.tremolo, Tone.Master)


	baseSynth = new BaseSynth()

	baseSynth.out.connect(room.in)

	sections.forEach(section => {
		section.voice.lineOut.connect(room.in)
	})
}

// P5 setup
function saveImage() {
	saveCanvas('please_remember' + Date.now(), 'png')
}

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
			section.color.current = chroma.mix(section.color.start, section.color.end, section.color.iterator, 'hsv')

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

	if (utterance.length === 'short') {
		textAlign(CENTER)
		textSize(45)
		text(utterance.text, windowWidth / 2, windowHeight / 3)
	} else {
		textAlign(CENTER)
		textSize(40)
		text(utterance.text, windowWidth * 0.25, windowHeight * 0.1, windowWidth / 2)
	}

	textSize(20)
	text('prepare.awakening.systems', windowWidth / 2, windowHeight - 40)
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

//** Playback Controls **//
function startPlayback() {
	Tone.Transport.start()
	newWave()
}

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

function toggleFullScreen() {
  if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen(); 
    }
  }
}

var fullscreenButton = document.getElementById('fullscreen-button')
fullscreenButton.addEventListener("click", e => {
	toggleFullScreen()
})


var logo = document.getElementById('logo')
logo.addEventListener("click", e => {
	window.open('https://awakening.systems', '_blank')
})

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

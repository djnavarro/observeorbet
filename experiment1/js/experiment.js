
// ------------ constants -------------
nInstruct = 4 // instruction items 
nQuestions = 4 // check questions
feedbackInterval = 500 // time spent showing feedback
maxTrials = 50 // can't change this now!!!
nGames = 5 


// ------------ window events -------------
window.onload = onLoadHandler
window.onbeforeunload = onBeforeUnloadHandler

// ------------ globals -------------
var data={} // data object
var tic // timer

// timing
data.startTime = Date.now() 
data.stopTime = 0

// boring stuff
data.instructionFails = 0 // how many times did they fail the check?
data.instructionTime = [] // track how long they looked at the instructions
data.instructionCheckScore = [] // how many questions did they get right each time?
data.demographics = {} // we need demographic information
data.turkcode = Math.floor( Math.random()*8999 )+1000 // generate completion code
data.unloadAttempts = 0 // idle curiosity: does anyone really try to leave?

// write the turk code to the document right at the beginning
document.getElementById("turkcode").innerText = data.turkcode 

// interesting stuff
data.condition = Math.round	( Math.random() ) // 0=stationary, 1=changing
data.sequenceVersion = randomInteger(1,3) // 1,2,3
data.trueSequence = getSequences( data.condition, data.sequenceVersion )
data.observationsMade = getEmptyData();
data.guessesMade = getEmptyData();
data.pointsEarned = getEmptyData();

var trial = 0 
var game = 0
var instruct = 1
var checkCount = 0


// ------------ on load -------------

function onLoadHandler() {
	
	//preload images:
	var imglist=["./img/box0.png","./img/box1.png","./img/box2.png","./img/guess1.png","./img/guess2.png","./img/interface.png"]
	preloadImages(imglist)
	
//	var imglist = []
//	for( i=0; i<48; i++) imglist[i] = "./img/pic"+ (i+1)+".png"
//	preloadImages(imglist)
	
	
	// focus on start button
	setFocus( "splashButton" )
	
}



// ------------ functions: flow control -------------

function splashButtonClick() {
	setDisplay('splash','none') 
	setDisplay('demographics','')
	setHeader('Demographics') 
}

function demographicsButtonClick() {
	setDisplay('demographics','none') 
	setHeader('A Simple Guessing Game')
	recordDemographics()
	writeData()
	setDisplay('instruction','')
	setFocus('instructionButton')
	tic = Date.now() // start timer [see ***]
} 

function instructionButtonClick() {

	if( instruct==nInstruct-1) { // change the text when we first reach last instruction
		document.getElementById("instructionButton").value = "Check your knowledge!"
	}

	if( instruct >= nInstruct ) { // if all instructions are revealed, move along
		setDisplay('instruction','none') 
		setDisplay('check','') 
		setHeader('Check Your Knowledge!')
		toc = Date.now() // stop timer [see ***]
		
	} else { // reveal next instruction if needed
		
		// hack to introduce the extra box in the dynamic condition
		if( data.condition == 1 & instruct == 2 & document.getElementById("specialInstruction").style.display == "none" ) {
			setDisplay('specialInstruction',"")
			setBoxBorder( instruct-1, '2px dotted grey' )
			// scroll to??
			instruct--
		} else {
			setDisplay('instruction'+instruct,'')
			if( data.condition==1 & instruct == 2 & document.getElementById("specialInstruction").style.display == "") { // hack
				document.getElementById('specialInstructionInner').style.border='2px dotted grey' 
			} else {
				setBoxBorder( instruct-1, '2px dotted grey' )	
			}
			scrollTo('instruct'+instruct)
		}

	}
	instruct++
}

function checkButtonClick() {
	setDisplay( 'check', 'none')
	
	var success = storeInstructionData()
	if( success ) {
		setHeader('Correct!')
		setDisplay( 'checkSuccess', '')
		setFocus('checkSuccessButton')
	} else {
		clearCheckRadio()
		setHeader('Please Try Again!')
		setDisplay( 'checkFail', '')
		setFocus('checkFailButton')
	}
	
}

function checkSuccessButtonClick() {
	setDisplay( 'checkSuccess', 'none')
	setDisplay( 'expt', '' )
	nextTrial()
}

function checkFailButtonClick() {
	setDisplay( 'checkFail', 'none')
	checkCount++
	setBoxBorder( nInstruct-1, '2px dotted grey' )
	setDisplay( 'instruction', '' )
	setHeader('Observe or Guess')
	setFocus('instructionButton')
	scrollTo('top')
	tic = Date.now() // start timer [see ***]
}

function endGameButtonClick() {
	
	// hide all the feedback 
	setDisplay( "gameScore", "none" ) 
	setDisplay( "gameFeedback", "none" )
	setVisibility( "gameFeedbackRow1", "hidden" ) 
	setVisibility( "gameFeedbackRow2", "hidden" ) 
	setVisibility( "gameFeedbackRow3", "hidden" ) 		
	
	// finish
	game++
	if( game >= nGames ) {
		wrapUp() 
	} else {
		trial = 0
		setDisplay( 'expt', '' ) // reveal experiment
		nextTrial()
	}
	
}


function wrapUp() {	
	data.stopTime = Date.now()
	writeData()
	setHeader( "Finished!") 
	setDisplay( "wrapup", "")
	window.onbeforeunload = function(){}
}


// ------------ functions: data storage -------------

// function storing demographic data
function recordDemographics() {
	data.demographics.gender = getRadioButton("gender")
	data.demographics.age = document.getElementById("age").value
	data.demographics.language = document.getElementById("language").value
	data.demographics.country = document.getElementById("country").value
}

// function storing data from an instruction read/check
function storeInstructionData() {
	var val
	var nCorrect=0
	for( var q=0; q<nQuestions; q++) {
		val = getRadioButton("question"+q)
		if( val=="correct") nCorrect++
	}
	
	// store
	data.instructionTime[ checkCount ] = toc-tic  // [see ***]
	data.instructionCheckScore[ checkCount ] = nCorrect
	data.instructionFails = checkCount 
	
	// return
	var success = nCorrect == nQuestions
	return success
}

// function storing data from the trial
function storeTrialData() {
	var toc = Date.now() // stop the timer [see **]
	data.response[trial] = document.getElementById("responseBox").value
	data.responseTime[trial] = toc-tic // rt in ms is the difference
}


// function writing data to disk
function writeData() {
	var dataString = JSON.stringify( data )
	//console.log( dataString ) // comment this out for the real thing
    $.post('submit', {"content": dataString}); // uncomment this to have it actually write [remember to load jQuery!!]
}


// ------------ functions: actions during the experment -------------


// run a trial
function nextTrial(){
	
	if( trial >= maxTrials ) {
		gameFeedback()
	} else {
		setHeader( "Game " + (game+1) + " of " + nGames + ": Action " + (trial+1) + " of " + maxTrials ) // header 
		setMachineState( "box0" ) // set the machine state to off
	}
	
}

// display the state of the machine
function setMachineState( s ){
	document.getElementById( "machine" ).src = "./img/" + s + ".png" // image
} 

// respond to a user betting 
function betAction( b ) {
	
	// record the guess
	data.guessesMade[game][trial] = b 
	data.observationsMade[game][trial] = 0
	if( b==data.trueSequence[game][trial] ) {
		data.pointsEarned[game][trial] = 1
	} else {
		data.pointsEarned[game][trial] = -1
	}
	
	
	// change the display
	setMachineState("guess" + b)  // show the guess
	setDisplay( "response", "none") // hide response buttons
	
	// wait and then move on
	setTimeout( function(){ 
		setMachineState( "box0" ) // restore the blank state
		setDisplay( "response", '') // restore the response buttons
		trial++ // increment the trial counter
		nextTrial() // move on
	}, feedbackInterval )
	
} 

// respond to the user observing
function observeAction() {
	
	// record the observation
	data.guessesMade[game][trial] = 0
	data.observationsMade[game][trial] = data.trueSequence[game][trial]
	data.pointsEarned[game][trial] = 0
	
	// what state does the machine have, 1 or 2?
	var s = data.trueSequence[game][trial]
	
	// change the display 
	setMachineState("box" + s)  // show state
	setDisplay( "response", "none") // hide response buttons
	 
	// wait before moving on
	setTimeout( function(){ 
		setMachineState( "box0" ) // restore the blank state
		setDisplay( "response", '') // restore the response buttons
		trial++ // increment the trial counter
		nextTrial() // move on 
	}, feedbackInterval ) 
	
}


// ------------ functions: feedback after a game -------------


// grab the canvases and contexts...
var canvas = [ 	document.getElementById("feedbackCanvas1"), 
				document.getElementById("feedbackCanvas2"),
				document.getElementById("feedbackCanvas3"),
				document.getElementById("feedbackCanvas4"),
				document.getElementById("feedbackCanvas5") ]
				
var context = [ canvas[0].getContext("2d"),
				canvas[1].getContext("2d"),  
				canvas[2].getContext("2d"), 
				canvas[3].getContext("2d"),
				canvas[4].getContext("2d")  ]

// give the user feedback about the game just played
function gameFeedback() {
	
	setDisplay( "expt", "none" )
	setHeader( "Your performance:")
	setDisplay( "gameFeedback", "" )	
	
	// clear the canvases
	for( var i=0; i<=4; i++) {
		context[i].clearRect ( 0 , 0 , 608 , 20 );
	}

	// compute the score (there's probably a way of summing an array...)
	var right = 0
	var wrong = 0
	for( i=0; i<maxTrials; i++ ) {
		if( data.pointsEarned[game][i] == 1 ) right++
		if( data.pointsEarned[game][i] == -1 ) wrong--
	}
	var points = right + wrong

	// show the labels
	setVisibility( "gameFeedbackRow1", "visible" ) 
	setTimeout( function(){ setVisibility( "gameFeedbackRow2", "visible" ) }, 3000 )
	setTimeout( function(){ setVisibility( "gameFeedbackRow3", "visible" ) }, 6000 )
	
	// show the data 
	drawData( 0, 1000, data.observationsMade[game] )
	drawData( 1, 1000, data.guessesMade[game] )
	drawData( 2, 4000, data.trueSequence[game] ) 
	drawData( 3, 7000, data.pointsEarned[game] )
	drawData( 4, 7000, data.pointsEarned[game] )
	
	// if its the last game change the button text
	if( game >= nGames-1 ) {
		document.getElementById('endGameButton').value = "Click for completion code!"
	}
	
	// reveal score
	setTimeout( function(){ 
		
		// set the score
		document.getElementById('correctGuesses').innerHTML = right;
		document.getElementById('incorrectGuesses').innerHTML = wrong;
		document.getElementById('totalPoints').innerHTML = "<b>" + points  + "</b>";
		
		// reveal the score
		setDisplay( "gameScore", "" ) 
	}, 10000 )
	

	
}

									
function drawData( ctx, interval, state ) {
	
	// constants
	var xloc = 5
	var step = 20
	var size = 10
	var gap = 2
	var when
	
	if( ctx == 0 | ctx == 2 ) { // observed events or true machine state
		var col = ["white","blue","red" ]
		var yloc = 10
	}
	if( ctx == 1 ) { // guesses
		var col = ["white","blue","red" ]
		var yloc = 15
	}	
	if( ctx == 3 ) { // correct feedback
		var col = ["green"]
		var yloc = 15 
	}
	if( ctx == 4) { // incorrect feedback
		var col = ["black"]
		var yloc = 15 
	}
	
	
	
	// wait until start
	setTimeout( function(){
		
		var count = 0
		var t = setInterval( function(){
			
			// draw the circle if it's an observed event or a true machine state
			if( ctx ==0 | ctx ==2 ) {
				
				context[ctx].beginPath();
		      	context[ctx].arc(xloc + size/2, yloc, size/2, 0, 2 * Math.PI, false);		
				context[ctx].fillStyle = col[state[count]]; 
			//	context[ctx].fillRect( xloc, yloc, size, size );
			 	context[ctx].fill();
				
			}
			
			// draw ?s if it's a guess event
			if( ctx == 1 ) {
				context[ctx].fillStyle = col[state[count]]; 
				context[ctx].font = "15px Arial";
				context[ctx].fillText("?",xloc, yloc);
			}
			
			// draw x for correct guess
			if( ctx == 3 ) {
				context[ctx].fillStyle = col[0];
				context[ctx].font = "20px Arial";	
				if( state[count]==1) {
					context[ctx].fillText("x",xloc, yloc);
				}
			}
			
			// draw x for incorrect guess
			if( ctx == 4 ) {
				context[ctx].fillStyle = col[0];
				context[ctx].font = "20px Arial";	
				if( state[count]==-1) {
					context[ctx].fillText("x",xloc, yloc);
				}
			}			

			// update variables higher up in the scope chain
			xloc = xloc + (size+gap)
			count++
			if( count >= maxTrials ) clearTimeout( t )			
			
		}, step)
		
		
	}, interval )

}


// ------------ functions: get the sequences -------------

function getSequences( cond, version ) {
	
	//var s = [];
	//for( var g=0; g<nGames; g++ ) {
	//	s[g] = bernoulliSequence( .75, maxTrials ) 
	//}
	
	
	// stationary
	if( cond==0 ) {
		
		if( version==1 ) { // version 1
		
			var s = [
			[0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0],
			[0,0,0,0,1,0,1,0,1,1,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,1,1,1,0],
			[1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,0,1,1,1,1,0,1,0,1,1,0,0,0,1,1,0,1,1,1,1,0,1,1],
			[0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,1,0,0,0,0,0,0],
			[1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0]
			]
			
		}
		
		if( version==2 ) {
		
			var s = [
			[0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,1,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0],
			[0,0,0,0,1,0,1,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,1,0,1,1,0,0,0,1,0,0,0,0,1,1,0,0,0],
			[0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0],
			[0,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1],
			[1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1,1,1,0,1,0,0,0,1,1,1,1,1,0,1,1,1,1,1]
			]
			
		}
		
		if (version==3) {
			
			var s = [
			[0,1,1,1,0,1,0,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1],
			[1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,1,0,1,1,1,1,0,0,1,1,1,1,1],
			[0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0],
			[1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,0,0,0,1,1,1,1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1],
			[1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1]
			]
			
		}
		
	}
	
	
	// dynamic
	if( cond==1) {
		
		if( version==1 ) { // version 1
		
			var s = [
			[0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0],
			[0,0,0,0,1,0,1,0,1,1,0,0,0,0,0,0,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,0,1,1,1,1,1,1,0,1,1,1,1,0,0,0,1],
			[1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,0,0,1,0,0,0,0,1,0,1,0,0,1,1,1,0,0,1,0,0,0,0,1,0,0],
			[0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,1,0,0,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,0,1,1,1,1,1,1],
			[1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1]
			]
			
		}
		
		if (version==2) {
			
			var s = [
			[0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,1,1,1,1,0,1,1,0,1,1,0,1,1,1,1],
			[0,0,0,0,1,0,1,0,0,1,1,0,0,0,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,0,1,1,0,1,0,0,1,1,1,0,1,1,1,1,0,0,1,1,1],
			[0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,1,0,1,0,1,1,1,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0],
			[0,1,0,1,0,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0],
			[1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,1,0,1,1,1,0,0,0,0,0,1,0,0,0,0,0]
			]

		}
		
		if (version==3) {
			
			var s = [
			[0,1,1,1,0,1,0,1,0,1,1,1,1,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0],
			[1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,0,0,1,1,0,0,0,0,0],
			[0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1],
			[1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
			[1,1,1,1,0,0,1,0,0,1,1,1,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,1,1]
			]
			
		}
		
	}
	
	// increment by 1
	for( var g=0; g<nGames; g++) {
		for( var t=0; t<maxTrials; t++) {
			s[g][t]++
		}
	}
	
	return(s)
	
}

function getEmptyData() {
	
	var s = [];
	for( var g=0; g<nGames; g++ ) {
		s[g] = [];
	}
	return(s)
	
}




// ------------ functions: computational helpers -------------


// uniform integer between a and b inclusive
function randomInteger( a, b ) {
	return( Math.floor((Math.random()*(b-a+1)) +a))
}



// ------------ functions: generic UI helpers -------------

// move to the specified location
function scrollTo(hash) {
    location.hash = "#" + hash;
}

// get the value of a radio button
function getRadioButton( name ) {
	var radios = document.getElementsByName( name );
	for (var i = 0, length = radios.length; i < length; i++) {
	    if (radios[i].checked) {
	        return( radios[i].value )
		}
	}
}

// function to change the display property of a set of objects
function setDisplay( theClass, theValue ) {
	var classElements = document.getElementsByClassName( theClass )
	for( var i=0; i< classElements.length; i++ ) { 
		classElements[i].style.display = theValue
	}
}

// function to change the visibility property of a set of objects
function setVisibility( theClass, theValue ) {
	var classElements = document.getElementsByClassName( theClass )
	for( var i=0; i< classElements.length; i++ ) { 
		classElements[i].style.visibility = theValue
	}
}

// set the focus
function setFocus( theElement ) {
	document.getElementById( theElement ).focus()
}


// ------------ functions: specific UI helpers -------------

// alter the header
function setHeader( theValue ) {
	document.getElementById("header").innerText =  theValue
}

// alter the border (on one of the instruction boxes)
function setBoxBorder( whichBox, theValue ) {
	document.getElementById('instruction'+ whichBox +'inner').style.border=theValue
}

// clear all the check marks for the radio buttons on the instruction checks
function clearCheckRadio() {
	var radios = document.getElementsByClassName( 'checkRadio' );
	for (var i = 0, length = radios.length; i < length; i++) {
		radios[i].checked = false
	}
}

// pre load immages
function preloadImages(arr){
    var newimages=[]
    var arr=(typeof arr!="object")? [arr] : arr //force arr parameter to always be an array
    for (var i=0; i<arr.length; i++){
        newimages[i]=new Image()
        newimages[i].src=arr[i]
    }
}
 



// ------------ functions: window unload handler -------------

function onBeforeUnloadHandler(e) {
	
  // store it.
  data.unloadAttempts++
	
  var message = "You are about to leave this page, but have not yet finished the experiment or received the completion code for the HIT",
  e = e || window.event;
  // For IE and Firefox
  if (e) {
    e.returnValue = message;
  }

  // For Safari
  return message;
};
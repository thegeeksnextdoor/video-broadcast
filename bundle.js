(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebRTC = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PeerConnection = require('./PeerConnection');
var Indicator = require('./Indicator');

function AllConnection(){
	var local;
	var stream;
	var host;
	var socket;
	this.connection = {};
	this.indicator = new Indicator();
	this.localVideo = document.getElementById("localVideo");
	this.localVideo.autoplay = true;
}

//initialise the setup of AllConnection
AllConnection.prototype.init = function(user, socket){
	var self = this;
	this.local = user;
	this.socket = socket;
}

//initialise the setup of own camera
AllConnection.prototype.initCamera = function(cb){
	var self = this;
	if (this.indicator.hasUserMedia()) {
		navigator.getUserMedia({ video: true, audio: true }, function (stream) {
			self.localVideo.src = window.URL.createObjectURL(stream);
			self.stream = stream;
			console.log("stream is ");
			console.log(stream);
			cb();
		}, function (error) {
			console.log(error);
		});
	} else {
		alert("Sorry, your browser does not support WebRTC.");
	}
}

//initialise a connection with peers
AllConnection.prototype.initConnection = function(peer){
	var self = this;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.localVideo);
	self.connection[peer].startConnection(function(){

		if (self.local === self.host){
			console.log("initiate connection as a host");
			self.connection[peer].hostSetupPeerConnection(peer, self.stream, function(){
				self.connection[peer].makeOffer( function(offer){
					console.log("send offer to " + peer);
					self.socket.emit("SDPOffer", {
						type: "SDPOffer",
						local: self.local,
						remote: peer,
						offer: offer
					});
				});
			});
		} else {
			console.log("initiate connection as a visitor");
			self.initCamera(function(){
				self.connection[peer].visitorSetupPeerConnection(peer, self.stream,  function(){
					self.connection[peer].makeOffer( function(offer){
						console.log("send offer to " + peer);
						self.socket.emit("SDPOffer", {
							type: "SDPOffer",
							local: self.local,
							remote: peer,
							offer: offer
						});
					});
				});
			});
		}
	})
}

//setup environment to be connected by others
AllConnection.prototype.buildEnvironment = function(peer, cb){
	var self = this;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.localVideo);
	self.connection[peer].startConnection(function(){
		if (self.local === self.host){
			console.log("initiate connection as a host");
			self.connection[peer].hostSetupPeerConnection(peer, self.stream, function(){
				cb();
			})
		}else {
			self.initCamera(function(){
				console.log("initiate connection as a visitor");
				self.connection[peer].visitorSetupPeerConnection(peer, self.stream, function(){
					cb();
				});
			});
		}
	});
}

//when receive an spd offer
AllConnection.prototype.onOffer = function(sdpOffer){
	var self = this;
	self.connection[sdpOffer.remote].receiveOffer(sdpOffer, function(sdpAnswer){
		self.socket.emit("SDPAnswer", {
			type: "SDPAnswer",
			local: self.local,
			remote: sdpOffer.remote,
			answer: sdpAnswer
		});
	}) 
}

//when receive an spd answer
AllConnection.prototype.onAnswer = function(sdpAnswer){
	this.connection[sdpAnswer.remote].receiveAnswer(sdpAnswer);
}

//when receive an ice candidate
AllConnection.prototype.onCandidate = function(iceCandidate){
	this.connection[iceCandidate.remote].addCandidate(iceCandidate);
}

module.exports = AllConnection;
},{"./Indicator":2,"./PeerConnection":3}],2:[function(require,module,exports){
function Indicator(){}

//indicate whether the browser supports user media
Indicator.prototype.hasUserMedia = function(){
	navigator.getUserMedia = navigator.getUserMedia ||
	navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
	navigator.msGetUserMedia;
	return !!navigator.getUserMedia;
}

//indicate whether the browser supports RTCPeerConnection
Indicator.prototype.hasRTCPeerConnection = function() {
	window.RTCPeerConnection = window.RTCPeerConnection ||
	window.webkitRTCPeerConnection || window.mozRTCPeerConnection
	window.RTCSessionDescription = window.RTCSessionDescription
	window.webkitRTCSessionDescription ||
	window.mozRTCSessionDescription;
	window.RTCIceCandidate = window.RTCIceCandidate ||
	window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
	return !!window.RTCPeerConnection;
}

module.exports = Indicator;
},{}],3:[function(require,module,exports){

function PeerConnection(local, peer, socket, localVideo){
	var p2pConnection;
	var indicator;
	this.user = local;
	this.remote = peer;
	this.socket = socket;
	this.localVideo = localVideo;
	this.theirVideo = document.getElementById("remoteVideo");
	this.configuration = {
			"iceServers": [{ "url": "stun:stun.1.google.com:19302"
			}]
	};
}

//Visitor setup the p2p connection with a peer
PeerConnection.prototype.visitorSetupPeerConnection = function(peer, stream, cb) {
	var self = this;
	// Setup stream listening
	console.log("listen to stream");
	this.p2pConnection.addStream(stream);
	/*this.p2pConnection.onaddstream = function (e) {
		self.localVideo.src = window.URL.createObjectURL(e.stream);
	};*/

	// Setup ice handling
	console.log("start ice handling");
	this.p2pConnection.onicecandidate = function (event) {
		if (event.candidate) {
			console.log(event.candidate);
			self.socket.emit("candidate", {
				type: "candidate",
				local: self.user,
				remote: peer,
				candidate: event.candidate
			});
		}
	};
	cb();
}

//Host setup the p2p connection with a peer
PeerConnection.prototype.hostSetupPeerConnection = function(peer, stream, cb) {
	var self = this;
	// Add stream
	/*this.p2pConnection.addStream(stream);*/
	this.p2pConnection.onaddstream = function (e) {
		self.localVideo.src = window.URL.createObjectURL(e.stream);
	};
	// Setup ice handling
	this.p2pConnection.onicecandidate = function (event) {
		if (event.candidate) {
			console.log("send an ice candidate");
			console.log(event.candidate);
			self.socket.emit("candidate", {
				type: "candidate",
				local: self.user,
				remote: peer,
				candidate: event.candidate
			});
		}
	};
	cb();
}

//initialise p2pconnection at the start of a peer connection 
PeerConnection.prototype.startConnection = function(cb){
	this.p2pConnection = new RTCPeerConnection(this.configuration);
	cb();
}

//make an sdp offer
PeerConnection.prototype.makeOffer = function(cb)	{
	var self = this;
	this.p2pConnection.createOffer(function (sdpOffer) {
		sdpOffer.sdp = sdpOffer.sdp.replace(/a=sendrecv/g,"a=sendonly");
		self.p2pConnection.setLocalDescription(sdpOffer);
		cb(sdpOffer);
	}, function(error){
		console.log(error);
	});
}

//receive an sdp offer and create an sdp answer
PeerConnection.prototype.receiveOffer = function(sdpOffer, cb){
	var self = this;
	var SDPOffer = new RTCSessionDescription(sdpOffer.offer);
	this.p2pConnection.setRemoteDescription(SDPOffer, function(){
		self.p2pConnection.createAnswer(function (answer) {
			answer.sdp = answer.sdp.replace(/a=sendrecv/g,"a=recvonly");
			self.p2pConnection.setLocalDescription(answer);
			console.log(self.p2pConnection.localDescription);
			console.log(self.p2pConnection.remoteDescription);
			cb(answer);
		},function(error){
			console.log(error);
		});
	}, function(){});
}

//receive an spd answer
PeerConnection.prototype.receiveAnswer = function(sdpAnswer){
	var SDPAnswer = new RTCSessionDescription(sdpAnswer.answer);
	this.p2pConnection.setRemoteDescription(SDPAnswer,function(){}, function(){});
	console.log(this.p2pConnection.localDescription);
	console.log(this.p2pConnection.remoteDescription);
}

//add ice candidate when receive one
PeerConnection.prototype.addCandidate = function(iceCandidate) {
	this.p2pConnection.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate));
}

module.exports = PeerConnection;
},{}],4:[function(require,module,exports){
var AllConnection = require('./AllConnection');

function WebRTC(server){
	var self = this;
	var user;
	this.allConnection = new AllConnection();;
	this.socket = io(server);

	//responde to different socket received from server

	self.socket.on("feedback", function(feedback) {
		document.getElementById("feedback").value = feedback;
	})

	//new user enter the room
	self.socket.on("newUser", function(newUserData) {
		self.allConnection.buildEnvironment(newUserData, function(){
			self.socket.emit("ICESetupStatus", {
				type: "ICESetupStatus",
				local: self.user,
				remote: newUserData,
				ICESetupStatus: "DONE"
			});
			console.log("ICE setup Ready");
		});
	})

	//receive a sdp offer
	self.socket.on("SDPOffer", function(sdpOffer) {
		self.allConnection.onOffer(sdpOffer);
	})

	//receive a sdp answer
	self.socket.on("SDPAnswer", function(sdpAnswer) {
		self.allConnection.onAnswer(sdpAnswer);
	})

	//receive an ice candidate
	self.socket.on("candidate", function(iceCandidate) {
		console.log("receive an ice candidate");
		self.allConnection.onCandidate(iceCandidate);
	})

	/* receive the status message of ICE setup from the peer
	 * before sending a sdp offer
	 * */
	self.socket.on("ICESetupStatus", function(iceSetupData){
		self.allConnection.initConnection(iceSetupData.remote);
	})

	// when a user in the room disconnnected
	self.socket.on("disconnectedUser", function(disConnectedUserName) {
		console.log("user " + disConnectedUserName + " is disconnected");
		self.allConnection.connection[disConnectedUserName] = null;
		self.onUserDisconnect(disConnectedUserName);
	})

	// when the user receive a chat message
	self.socket.on("chatMessage", function(chatMessageData){
		self.onChatMessage(chatMessageData);
	})

	// when the user receive the name of the host
	self.socket.on("host", function(hostData){
		self.allConnection.host = hostData.host;
	})

	self.socket.on("startCamera", function(){
		self.startCamera(function(){});
	});
}


//find more details of following api in readme
WebRTC.prototype.login = function(userName, successCallback, failCallback) {
	var self = this;
	this.socket.emit("login", userName);
	this.socket.on("login", function(loginResponse){
		if (loginResponse.status === "success") {
			self.user = loginResponse.userName;
			self.allConnection.init(loginResponse.userName, self.socket);
			successCallback();
		} else if (loginResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.createRoom = function(roomId, successCallback, failCallback){
	var self = this;
	this.socket.emit("createRoom", roomId);
	this.socket.on("createRoom", function(createRoomResponse){
		if (createRoomResponse.status === "success") {
			successCallback();
		} else if (createRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.startCamera = function(cb){
	var self = this;
	console.log("start camera");
	try {
		//self.allConnection.initCamera(function(){
			self.socket.emit("setupCamera", {
				type: "setupCamera",
				cameraSetupStatus: "success"
			});
	/*	});
		cb();*/
	}catch(e){
		self.socket.emit("setupCamera", {
			type: "setupCamera",
			cameraSetupStatus: "fail"
		});
	}
}

WebRTC.prototype.joinRoom = function(roomId, successCallback, failCallback) {
	var self = this;
	this.socket.emit("joinRoom", roomId);
	this.socket.on("joinRoom", function(joinRoomResponse){
		if (joinRoomResponse.status === "success") {
			successCallback();
		} else if (joinRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.getPeers = function(cb){
	var self = this;
	this.socket.emit("peer");
	self.socket.on("peer", function(peerList){
		cb(peerList);
	})
}

WebRTC.prototype.onUserDisconnect = function(userDisconnected){
}

WebRTC.prototype.sendChatMessage = function(chatMessage){
	var self = this;
	this.socket.emit("chatMessage", {
		type: "chatMessage",
		user: self.user,
		content: chatMessage
	})
}

WebRTC.prototype.setHost = function(host){
	this.socket.emit("host", {
		type: "host",
		host: host
	})
}

WebRTC.prototype.onChatMessage = function(chatMessageData){
}

module.exports = WebRTC;
},{"./AllConnection":1}]},{},[4])(4)
});
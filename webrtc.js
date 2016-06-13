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
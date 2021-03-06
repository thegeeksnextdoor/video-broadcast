var app = require("http").createServer();
var io = require("socket.io")(app);
//user stores all the sockets
var user = {};
//room stores all the room id
var room = {};

app.listen(8080);

io.on("connection", function(socket){

	socket.on("login", function(userName){

		console.log("User " + userName + " logins");

		try {
			if (user[userName]){

				socket.emit("login", {
					type: "login",
					userName: userName,
					status: "fail"
				});

				console.log("Login unsuccessfully");
			} else{
				user[userName] = socket;
				user[userName].userName = userName;
				socket.emit("login", {
					type: "login",
					userName: userName,
					status: "success"
				});
			}}catch (e){
				console.log(e);
			}
	})

	socket.on("createRoom", function(roomId){
		try {
			if (room[roomId]){
				socket.emit("createRoom", {
					type: "createRoom",
					userName: socket.userName,
					room: roomId,
					status: "fail"
				});
			} else{
				room[roomId] = {};
				room[roomId].roomId = roomId;
				user[socket.userName].room = roomId; 
				//user[socket.userName].join(room[roomId]); 

				socket.emit("createRoom", {
					type: "createRoom",
					userName: socket.userName,
					room: roomId,
					status: "success"
				});

				socket.emit("feedback", "Please set the host");

			}}catch (e){
				console.log(e);
			}
	})

	socket.on("joinRoom", function(roomId){
		try {
			if (room[roomId]){

				socket.emit("host", {
					type: "host",
					host: room[roomId].host
				});
				user[socket.userName].room = roomId;

				socket.emit("joinRoom", {
					type: "joinRoom",
					userName: socket.userName,
					status: "success"
				});

				if (socket.userName == room[roomId].host){
					socket.emit("startCamera");
				}else {
					user[socket.userName].join(socket.room);
					socket.broadcast.to(socket.room).emit("newUser", socket.userName);
					io.sockets.in(roomId).emit("feedback", "User " + socket.userName + " is in room " + roomId + " now" );	
				}
			} else{
				socket.emit("joinRoom", {
					type: "joinRoom",
					userName: socket.userName,
					room: roomId,
					status: "fail"
				});

			}}catch (e){
				console.log(e);
			}
	})

	socket.on("setupCamera", function(cameraSetupStatusData){
		if (cameraSetupStatusData.cameraSetupStatus === "success"){
			user[socket.userName].join(socket.room);
			socket.broadcast.to(socket.room).emit("newUser", socket.userName);
			socket.broadcast.to(socket.room).emit("feedback", "Host is inside the room");
		}
		else if (cameraSetupStatusData.cameraSetupStatus === "fail"){
			console.log(socket.userName + " failed to set up camera");
		}
	})

	socket.on("peer", function(){
		try {
			var clients = io.sockets.adapter.rooms[socket.room].sockets;   
			var userList = {};
			for (var clientId in clients ) {
				var clientSocket = io.sockets.connected[clientId];
				userList[clientSocket.userName] = clientSocket.userName;
			}

			socket.emit("peer", {
				type: "peer",
				allUser: userList
			});
		} catch(e){
			console.log(e);
		}
	})

	socket.on("SDPOffer", function(sdpOffer){

		console.log(sdpOffer.local + " is Sending offer to " + sdpOffer.remote);

		try {
			if (user[sdpOffer.remote]){
				user[sdpOffer.remote].emit("SDPOffer", {
					type: "SDPOffer",
					local: sdpOffer.remote,
					remote: sdpOffer.local,
					offer: sdpOffer.offer
				});
			}else{
				socket.emit("feedback", "Sending Offer: User does not exist or currently offline");
			}} catch(e){
				console.log(e);
			}
	})

	socket.on("SDPAnswer", function(sdpAnswer){
		console.log(  sdpAnswer.remote + " is Receiving Answer from " + sdpAnswer.local);

		try {
			if (user[sdpAnswer.remote]){
				user[sdpAnswer.remote].emit("SDPAnswer",{
					type: "SDPAnswer",
					local: sdpAnswer.remote,
					remote: sdpAnswer.local,
					answer: sdpAnswer.answer
				});	

			}else{
				socket.emit("feedback", "Sending Answer: User does not exist or currently offline");
			}} catch(e){
				console.log(e);
			}
	})

	socket.on("candidate", function(iceCandidate){
		console.log("an ice candidate is transfered");
		user[iceCandidate.remote].emit("candidate", {
			type: "candidate",
			local: iceCandidate.remote,
			remote: iceCandidate.local,
			candidate: iceCandidate.candidate
		});
	})

	socket.on("disconnect", function(){
		socket.broadcast.to(socket.room).emit("disconnectedUser", socket.userName);
		user[socket.userName] = null;
	})

	socket.on("ICESetupStatus", function(ICESetupStatus){
		try {
			if (user[ICESetupStatus.remote]){
				user[ICESetupStatus.remote].emit("ICESetupStatus", {
					type: "ICESetupStatus",
					local: ICESetupStatus.remote,
					remote: ICESetupStatus.local,
					offer: ICESetupStatus.offer
				});

			}else{
				socket.emit("feedback", "Sending Status: User does not exist or currently offline");
			}} catch(e){
				console.log(e);
			}
	})

	socket.on("chatMessage", function(chatMessageData){
		io.sockets.in(socket.room).emit("chatMessage", {
			type: "chatMessage",
			sender: chatMessageData.user,
			content: chatMessageData.content
		});
	})

	socket.on("host", function(hostData){
		try {
			room[socket.room].host = hostData.host;
			console.log("host of room " + socket.room + " is " + hostData.host);

			socket.emit("host", {
				type: "host",
				host: hostData.host
			});
			console.log("username is ");
			console.log(socket.userName);
			console.log("host is ");
			console.log(hostData.host);

			if (socket.userName == hostData.host){
				socket.emit("startCamera");
			}else {
				user[socket.userName].join(socket.room);
			}
		} catch(e){
			console.log(e);
		}
	})
})

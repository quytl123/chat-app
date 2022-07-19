require('dotenv').config();
const express = require('express');
const { createServer } = require('http')
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

const listUsersConnection = [];
const listRooms = [];
io.on('connection', (socket) => {
    console.log('Connect to socket ', socket.id);

    const userConnect = { socket: socket.id, ...socket.handshake.auth }
    const chatRoom = [socket.id];
    listRooms.push(chatRoom);

    // HANDLE USER CONNECT ----------------------------------------------------
    // get user information connection to server
    listUsersConnection.push(userConnect);

    // receive request from chat client
    socket.on('getListUserConnect', () => {
        // send list user connected to client
        socket.emit('listUsersConnected', listUsersConnection);
    });

    // send to other client receive user when connection
    socket.broadcast.emit('newUserConnect', userConnect);

    // HANDLE USER UPDATE INFORMATION -------------------------------------------
    // listen event user update information from client and send changed to all users
    socket.on('updateUserInformation', ({ fieldsName, data }) => {
        userConnect[`${fieldsName}`] = data;

        socket.broadcast.emit('newUserUpdateInformation', userConnect);

    });

    // HANDLE CHAT ROOM -----------------------------------------------------------
    socket.on('addUserToRoom', user => {
        if (chatRoom.length == 2) {
            chatRoom.splice(1, 1, user);
        } else {
            chatRoom.push(user);
        }
    });

    // HANDLE NOTIFICATIONS -------------------------------------------------------
    // listen event send new message then send notification have new message for specific user
    socket.on('notificationReceiveMessage', ({ sender, receiver }) => {
        const index = listRooms.findIndex(room => room[0] === receiver.socket);
        if (!listRooms[index].includes(socket.id)) {
            socket.to(`${receiver.socket}`).emit('notificationNewMessage', ({ sender, receiver }));
        }
    });

    socket.on('disconnect', () => {
        console.log(`${userConnect.socket} is disconnect`);
        const userIndex = listUsersConnection.findIndex(user => user.socket === socket.id);
        listUsersConnection.splice(userIndex, 1);

        const roomIndex = listRooms.findIndex(room => room[0] == socket.id);
        listRooms.splice(roomIndex, 1);

        socket.broadcast.emit('userDisconnect', userConnect);
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port + ${PORT}`);
});
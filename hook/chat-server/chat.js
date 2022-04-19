const uuidv4 = require('uuid').v4;

const messages = new Set();
const pics = [];
const users = {};

const defaultUser = {
  id: 'anon',
  name: 'Anonymous',
};

const messageExpirationTimeMS = 5*60 * 1000;

class Connection {
  constructor(io, socket) {
    this.socket = socket;
    this.io = io;
    let id = socket.id
    users[socket.id] = {
      userId: id,
      start: 0,
      end:0,
      time: 0,
      rounds: []
    }

    socket.on('getMessages', () => this.getMessages());
    socket.on('message', ({value, time}) => this.handleMessage(value, time));
    socket.on('pic', ({value, name, userId}) => this.handlePicClick(value, name, userId));
    socket.on('startTimer', (userId) => this.startTimer(userId));
    socket.on('disconnect', () => this.disconnect());
    socket.on('connect_error', (err) => {
      console.log(`connect_error due to ${err.message}`);
    });
  }

  startTimer(userId) {
    users[userId]["start"] = Date.now();
    console.log("started", users[userId]["start"])
  }

  handlePicClick(value, name, userId) {
    if (name == "target") {
      users[userId]["end"] = Date.now();
      console.log(users[userId]["end"], users[userId]["start"])
      let time = (users[userId]["end"] - users[userId]["start"]) / 1000
      const pic = {
        id: uuidv4(),
        user: userId,
        value,
        name,
        time: time
      };
      users[userId]["time"] = time;
      users[userId]["rounds"].push(time)
      this.io.sockets.emit('pic', pic, users);
      console.log("new", time)
      pics.push(pic);
    }
  }
  
  sendMessage(message) {
    this.io.sockets.emit('message', message);
  }
  
  getMessages() {
    messages.forEach((message) => this.sendMessage(message));
  }

  handleMessage(value, time) {
    const message = {
      id: uuidv4(),
      user: users.get(this.socket) || defaultUser,
      value,
      time: Date.now()
    };

    messages.add(message);
    this.sendMessage(message);

    setTimeout(
      () => {
        messages.delete(message);
        this.io.sockets.emit('deleteMessage', message.id);
      },
      messageExpirationTimeMS,
    );
  }

  disconnect() {
    // users = {}
  }
}

function chat(io) {
  io.on('connection', (socket) => {
    new Connection(io, socket);   
  });
};

module.exports = chat;
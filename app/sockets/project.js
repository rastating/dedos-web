var wrap = require('co-express');
var extend = require('util')._extend;
var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var User = mongoose.model('Player');

exports.join = function(room){
  console.log(room);
  this.join(room);
};
exports.leave = function(room){
  this.leave(room);
};

exports.player = {
  connected: function(data){
    //this.broadcast.emit('client:project:player:connected', data);
    //this.server.broadcast.to(data.room).emit('client:project:player:connected', data);
    //this.broadcast.emit('client:project:player:connected', data);
    //var user = yield User.load(data.id);
    this.join(data.room);
    this.player_id = data.id;
    this.id = data.room+"-"+data.id;
console.log(this);
    data.status = 'online';
    var io = this.server;
    User.load(data.id, function(err, user){
      extend(data, user);
      io.sockets.in(data.room).emit('client project:player:connected', data);
    });
  },
  disconnected: function(data){
    this.server.sockets.in(data.room).emit('client project:player:disconnected', data);
    //this.leave(room);
  }
};
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var fs = require('fs');
var util = require('util');
var wrap = require('co-express');

// Project model
var ProjectSchema = mongoose.Schema({
  name: String,
  project: String,
  description: String,
  educationLevel: String,
  subjects: [],
  screenshots: [],
  path: String,
  resolution: {
    x: Number,
    y: Number
  },
  players: [{
    avatar: String,
    user: {type: Schema.Types.ObjectId, ref: 'User'},
    status: {type: Number, default: 0}, // types: {0: Sin empezar, x: Numero de la actividad, -1: Terminado}
    online: {type: Boolean, default: false},
    // @TODO
    answers: [{type: Schema.Types.ObjectId, ref: 'Answer'}]
  }],
  activities: [{type: Schema.Types.ObjectId, ref: 'Activity'}],
  classroom: {type: Schema.Types.ObjectId, ref: 'Classroom'},
  // Propiedades extra del proyectos
  properties: {
    required: {type: Boolean, default: false},
    delayed: {type: Boolean, default: false},
    showActivities: {type: Boolean, default: false}
  },
  createdDate: {type: Date, default: Date.now},
  createdBy: {type: Schema.Types.ObjectId, ref: 'User'}
});

/**
 * Hooks
 */
ProjectSchema.pre('save', function(next) {
  next();
});

ProjectSchema.pre('remove', function(next) {
  const activities = this.activities;
  if (activities.length > 0) {
    this.activities.forEach(function(activity) {
      activity.remove();
    });
  }
  next();
  //this.model('Activity').remove({project: this._id}, next);
});

/**
 * Methods
 *
 * @type {{}}
 */
ProjectSchema.methods = {

  setActivities: function(activities) {
    if (util.isArray(activities)) {
      this.activities = activities;
      return this;
    }
  },
  saveFromXML: function(XML_data) {
    var self = this;
    var activities = [];
    XML_data.Activity.forEach(function(activity_data) {
      if (typeof activity_data != 'object') { return; }

      var activity = new Activity({project: self.id});
      activity.saveFromXML(activity_data);
      activities.push(activity);
    });
    this.setActivities(activities);
    return this;
  },
  setActivitiesFromXML: function(XML_data) {
    var self = this;
    var activities = [];
    XML_data.Activity.forEach(function(activity_data) {
      if (typeof activity_data != 'object') { return; }

      var activity = new Activity({project: self.id});
      activity.saveFromXML();
      activity.setObjectivesFromXML(activity_data.Objectives);
      activity.setElementsFromXML(activity_data.Arealist);
      //activity.save();
      activities.push(activity);
    });
    this.setActivities(activities);
    return this;
  },
  addPlayer: function(user) {
    this.players.push({
      avatar: user.avatar,
      user: user.id
    });
    return this;
  },
  setPlayers: function(users) {
    var self = this;
    this.players = [];
    users.forEach(function(user) {
      self.addPlayer(user);
    });
    return this;
  },
  setPlayerStatus: function(player_id, status) {
    this.players.forEach(function(player) {
      if (player.user.id == player_id) {
        player.status = status;
      }
    });
    return this;
  },
  getActivityNum: function(activity_id) {
    for (var i = 0; i < this.activities.length; i++) {
      if (this.activities[i].id === activity_id) {
        return i + 1;
      }
    };
    return false;
  }
};

/**
 * Statics
 */

ProjectSchema.statics = {

  /**
   * Buscar proyecto por id
   *
   * @param {ObjectId} options
   */

  load: function(options) {
    const criteria = options.criteria || {_id: options};
    return this.findOne(criteria)
      .populate('players.user')
      //.populate('comments.user')
      .populate('activities')
      .exec();
  },
  /**
   * Listar proyectos y filtrarlos
   *
   * @param {Object} options
   */

  list: function(options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      .populate('activities')
      .sort({createdDate: -1})
      .limit(limit)
      .skip(limit * page)
      .exec();
  }
};

mongoose.model('Project', ProjectSchema);

// Action model
var actionSchema = mongoose.Schema({
  player_id: {type: Schema.Types.ObjectId, ref: 'User'},
  action: String,
  answered: Boolean,
  done: Boolean,
  element_id: {type: Schema.Types.ObjectId, ref: 'Element'},
  createdDate: {type: Date, default: Date.now}
});
var Action  = mongoose.model('ActionXX', actionSchema);

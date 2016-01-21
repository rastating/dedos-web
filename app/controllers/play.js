var wrap = require('co-express');
var lib = require('../../lib/functions');
var gettext = require('../../i18n/i18n').gettext;
var _ = require('underscore');
var mongoose = require('mongoose');
var Project = mongoose.model('Project');
var Activity = mongoose.model('Activity');
var Area = mongoose.model('Area');
var Token = mongoose.model('Token');
var Player = mongoose.model('Player');
var Answer = mongoose.model('Answer');

exports.load = wrap(function*(req, res, next, id) {
  const options = {
    criteria: {
      project: id
    }
  };
  req.project = yield Project.load(options);
  if (req.session.player) {
    var player_session = {};
    player_session = req.session.player.filter(function(player) {
      return player.project == req.project.id ? player : '';
    });
    player_session = player_session.pop();
    req.player = player_session;
  }
  if (!req.project) { return next(new Error('Not found')); }

  next();
});

/**
 * Inicio del juego
 */
exports.index = wrap(function*(req, res) {
  console.log('SHOW');
  const project = req.project;
  var view = 'play/index';
  if (lib.isEmptyObject(req.player) || !req.player) {
    // @TODO
    //view = 'play/select_player';
  }
  var activity = project.activities[0];
  // @TODO
  // obtener la última actividad donde se tenga respuestas
  // o donde Answer tenga done = true

  //var activity = player.getPrevActivity(activity.id);
  //var activity = player.getNextActivity(activity.id);
  //var activity = player.getLastActivity(activity.id);
  const activity_data = {
    id: activity.id,
    num: project.getActivityNum(activity.id)
  };
  res.render(view, {
    title: gettext('play'),
    project: req.project,
    player: req.player,
    activity: activity_data
  });
});

/**
 * Funcionalidad sobre actividades
 *
 * @type {{load: *, show: *, check: *}}
 */
exports.activity = {
  load: wrap(function*(req, res, next, id) {
    var options = {
      criteria: {
        _id: id,
        project: req.project.id
      }
    };
    req.activity = yield Activity.load(options);

    var area_options = {
      criteria: {
        '_id': {$in: req.activity.elements},
        '__t': 'Area'
      }
    };
    req.activity.elements.area = yield Area.list(area_options);

    if (!req.activity) {return next(new Error('Not found')); }

    next();
  }),
  /**
   * Mostrar la actividad dado una id
   */
  show: wrap(function*(req, res) {

    const project = req.project;
    var activity = req.activity;
    // Socket emit
    //req.socket.emit('player:connected', { name: 'testing' });
    //status: {type: Number, default: 0}, // types: {0: Sin empezar, x: Numero de la actividad, -1: Terminado}
    //project.status = 3;
    //yield project.save();
    //yield Project.update({_id: req.project.id, 'players.user': req.body.player_id}, {$set: {'players.$.online': true}});
    //@TODO comprobar si el usuario ha completado o no el proyecto
    activity.num = project.getActivityNum(activity.id);
    project.setPlayerStatus(
      req.player.user.id,
      activity.num
    );
    project.save();
    // Target si los objetivos son de emparejamiento
    var targets = [];
    activity.objectives.forEach(function(objective) {
      if (objective.type == 'pair') {
        targets.push(objective.targets.join());
      }
    });
    res.render('play/show', {
      title: gettext('play'),
      project: project,
      activity: activity,
      targets: targets
    });
  }),
  /**
   * Comprobaciónes sobre información enviada
   * relacionada con el usuario y el/los token/s
   */
  check: wrap(function*(req, res) {
    const tokens = req.body.tokens;
    const activity = req.activity;
    var tokens_result = [];

    var selection = false;
    var pair = false;
    var tokenmeter = false;
    var type = 'tipo de objetivo';
    var targets = [];
    var tokensMeter = [];
    var activity_result = true;
    /**
     *
     * @type {Object} objectives
     * @property {String} objectives.select Objetivo de tipo Selección
     * @property {Array} objectives.pair Objetivo de tipo Emparejamiento
     * @property {Array} objectives.tokenmeter Objetivo de tipo Matemáticas
     */
    var objectives = {};
    var result = false;
    var value = 0;
    var token_results = [];
    activity.objectives.forEach(function(objective) {
      if (!objectives[objective.type]) {
        objectives[objective.type] = [];
      }
      objectives[objective.type].push(objective.getData());

      tokens.forEach(function(token) {
        if(!token_results[token.data.id]){
          token_results[token.data.id] = {};
        }
        if (!token_results[token.data.id] || !token_results[token.data.id].valid) {
          result = objective.checkToken(token);
          token_results[token.data.id] = {
            id: token.data.id,
            type: objective.type,
            valid: result,
            //value: objective.tokenValue(objective.getData()),
          };

          if (result) {
            if (token.droppedInto && token.droppedInto.currentValue > 0) {
              value = token.droppedInto.currentValue;
            }
            value += Number(token.data.value);
          }
        }
      });
    });
    console.log('Valor: ' + value);
    console.log(token_results);

    // @TODO insertar respuestas en el modelo Answer
    var answer_options = {
      player: req.player.user.id,
      activity: activity._id
    };
    var answer = yield Answer.load({
      criteria: answer_options
    });
    if (!answer) {
      var answer = new Answer(answer_options);
    }

    tokens.forEach(function(token) {

      // let result
      var result = false;
      //tokensCheck();
      //activity.checkToken(token, objectives);
      // Seleccion

      if (objectives['sel']) {
        type = 'selection';
        if (objectives['sel'].indexOf(token.data.name) != -1) {
          result = true;
        }
      }
      if (objectives['pair'] && token.droppedInto) {
        type = 'pair';
        objectives['pair'].forEach(function(target) {
          // Comprobar si el id del area que contiene al token es igual que el origen del objetivo.
          // if( === target.origen)
          if (token.data.name === target.origen || token.area_id === target.origen) {
            if (target.targets.indexOf(token.droppedInto.name) != -1) {
              if (!target.tokenMeter) {
                result = true;
               // console.log('EMPAREJAMIENTO_CORRECTO');
              } else {
                //Cosas para hacer si hay matemáticas
                type = 'tokenmeter';
                tokensMeter.forEach(function(tokmeter) {
                  if (tokmeter.currentValue === 0) {
                    tokmeter.currentValue = Number(token.droppedInto.currentValue);
                  }
                  if (tokmeter.id === token.droppedInto.name) {
                    tokmeter.currentValue = Number(tokmeter.currentValue) + Number(token.data.value);
                  }
                  if (tokmeter.currentValue < tokmeter.numValue) {
                    result = true;
                  }else if (tokmeter.currentValue == tokmeter.numValue) {
                    result = true;
                  } else {
                    activity_result = false;
                    result = false;
                  }
                });
              }
            }
          }
        });
      }
      if (!result) {
        activity_result = false;
      }
      tokens_result.push({
        id: token.data.id,
        type: type,
        valid: result
      });
      // Se añade como respuesta
      answer.addElement({token: token.data.id, valid: result, action: type});
      answer.valid = activity_result;
      activity.addAnswer(answer.id);
      activity.save();
      answer.save();
    });
    res.send({
      tokens: tokens_result,
      activity: {
        id: activity.id,
        valid: activity_result
      },
      tokensMeter: tokensMeter
    });
  })
};

/**
 * Jugador
 */
exports.player = wrap(function*(req, res) {
  // Solo se ejecuta por ajax
  if (req.xhr && req.body) {
    switch (req.body.type){
      // Seleccion de jugador
      case 'select':
        //yield Project.update({_id: req.project.id, 'players.user': req.body.player_id}, {$set: {'players.$.online': true}});
        var player = yield Player.load(req.body.player_id);
        var player_data = {
          project: req.project.id,
          user: {
            id: req.body.player_id,
            name: player.name,
            avatar: req.body.avatar
          }
        };
        if (!req.session.player) { req.session.player = []; }

        req.session.player.push(player_data);
        break;
    }
    res.json(player_data);
    //res.sendStatus(200);
  }
});

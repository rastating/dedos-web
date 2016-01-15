(function(window, document, $) {
  'use strict';
  var $doc = $(document);
  $.play = $.play || {};
  $.extend($.play, {
    defaults: {
      container: '.play',
      modals: {
        select_player: '#modal-select-player'
      }
    },
    init: function() {
      console.log('loaded');
    }
  });
  var $user = '';
  var $select_player = $('#modal-select-player');
  var $play = $('.play');

  //$(document).on('click', '.select-activity', function(e) {
  //  e.preventDefault();
  //  var url_data = $(this).attr('href');
  //  $.ajax({
  //    type: 'GET',
  //    url: url_data,
  //    success: function(html) {
  //      $play.html(html);
  //    }
  //  });
  //});

  console.log('{{req.project}}');

})(window, document, jQuery);

(function() {
  // Play Constructor
  this.Play = function() {
    // Opciones por defecto
    var defaults = {
      id: '',
      project: '',
      width: '',
      height: '',
      player: {
        id: '',
        name: ''
      },
      properties: {
        delayed: false,
        required: false
      },
      room: '',
      container: '.play',
      modals: {
        select_player: '#modal-select-player'
      }
    };
    this.options = defaults;
    // Create options by extending defaults with the passed in arugments
    if (arguments[0] && typeof arguments[0] === 'object') {
      this.options = $.extend(defaults, arguments[0]);
    }
    var $container = $(this.options.container);
    var $select_player = $(this.options.modals.select_player);
    var self = this;
    /**
     * Urls
     * @type {string}
     */
    var url_play = '/play/' + self.options.id;
    /**
     * Sockets
     */
    var sockets = {};
    /**
     * Elements
     * @type {{}}
     */
    var elements = this.elements = {};

    elements.load = function() {
      elementsAdjustSize();
    };
    /**
     * Funciones privadas de elements
     */
    function elementsAdjustSize() {
      var $elements = $container.find('.element');
      var res = {
        width: $container.find('.play-table').innerWidth(),
        height: $container.find('.play-table').height()
      };
      var coefficient = {
        x: (res.width * 1) / self.options.width,
        y: (res.height * 1) / self.options.height
      };
      $elements.hide();
      $elements.each(function() {
        $(this).css({
          'left': ($(this).data('position').x) * coefficient.x,
          'top': ($(this).data('position').y) * coefficient.y,
          'width': ($(this).data('size').width) * coefficient.x,
          'height': ($(this).data('size').height) * coefficient.y
        });
        $(this).fadeIn('fast');
      });
    }
    $(window).on('resize', elementsAdjustSize);

    /**
     * Actividad
     */

    // Sockets
    sockets.activity = {
      join: 'server project:activity:join'
    };
    // Eventos
    $(document).on('click', '.select-activity', function(e) {
      e.preventDefault();
      var activity_id = $(this).data('activity');
      var activity_num = $(this).data('num');
      var url_data = url_play + '/activity/' + activity_id;
      $.ajax({
        type: 'GET',
        url: url_data,
        success: function(html) {
          $container.html(html);
          $container.attr('data-context', activity_id);
          // Renderizado de elementos/tokens
          self.elements.load();
          // SOCKET emit
          socket.emit(sockets.activity.join, {
            room: self.options.room,
            activity: activity_id,
            status: activity_num,
            player: self.options.player
          });

        }
      });
    });
    // Función para comprobar respuestas en caso de demorada
    $(document).on('click', '#check-activity', function(e) {
      var activity_id = $(this).data('activity');
      var url_data = url_play + '/activity/' + activity_id + '/check';
      var tokens = [];
      $container.find('.clicked').each(function() {
        tokens.push({
          token_id: $(this).attr('id'),
          element_id: $(this).data('element')
        });
      });
      $.ajax({
        type: 'POST',
        dataType: 'json',
        url: url_data,
        data: {tokens: tokens},
        success: function(data) {
          $.each(data.tokens, function(i, token) {
            $('#' + token.id).addClass(function() {
              if (token.valid) { return 'correct checked'; } else { return 'wrong checked'; }
            });
          });
        }
      });
    });

    $(document).on('click', '.token-clickable', function(e) {
      var token_id = this.id;
      var element_id = $(this).data('element');
      var activity_id = $container.data('context');

      if (self.options.properties.delayed) {
        $('#' + token_id).toggleClass('clicked');
      } else {
        socket.emit('event:click:token', {id: element_id});
        $.ajax({
          type: 'POST',
          dataType: 'json',
          url: url_play + '/activity/' + activity_id + '/check',
          data: {
            tokens: [{token_id: token_id, element_id: element_id}]
          },
          success: function(data) {
            var token = data.tokens[0];
            $('#' + token.id).addClass(function() {
              if (token.valid) { return 'correct checked'; } else { return 'wrong checked'; }
            });
          }
        });
      };
    });

    console.log(this.options);
  };

}());
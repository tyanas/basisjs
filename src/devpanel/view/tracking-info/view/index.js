var Node = require('basis.ui').Node;
var api = require('api');
var trackerApi = require('../api.js');

var Path = require('./path.js');

var templates = require('basis.template').define('devpanel.tracking-info', {
  main: resource('./main/window.tmpl')
});
require('basis.template').theme('standalone').define('devpanel.tracking-info', {
  main: resource('./main/standalone.tmpl')
});

module.exports = Node.subclass({
  disabled: api.connected.as(basis.bool.invert),

  template: templates.main,
  binding: {
    connected: api.connected,
    rolesTree: 'satellite:',
    path: 'satellite:',
    trackingList: 'satellite:',

    hasSubject: {
      events: 'update',
      getter: function(node){
        return Boolean(node.data.hasTarget);
      }
    }
  },
  action: {
    close: function(){
      trackerApi.dropTarget();
    }
  },

  satellite: {
    path: Path
  },

  init: function(){
    Node.prototype.init.call(this);

    trackerApi.channel.link(this, this.update);
    api.connected.link(this, function(connected){
      if (connected)
        trackerApi.init(this.update.bind(this));
    });
  }
});

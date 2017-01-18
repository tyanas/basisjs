// var inspectBasis = require('devpanel').inspectBasis;
// var inspectBasisTracker = inspectBasis.require('basis.tracker');
var trackerApi = require('../api.js');
var api = require('api');

var Node = require('basis.ui').Node;

var templates = require('basis.template').define('devpanel.tracking-roles', {
  main: resource('./main/window.tmpl')
});
require('basis.template').theme('standalone').define('devpanel.tracking-roles', {
  main: resource('./main/standalone.tmpl')
});


//
// Role path to node
//
var Path = Node.subclass({
  autoDelegate: true,
  template: resource('./template/role-path.tmpl'),
  childClass: {
    template: resource('./template/role-path-part.tmpl'),
    binding: {
      role: function(node){
        return 'qqqq';
        // return inspectBasisTracker.stringifyRole(node.data);
      }
    }
  },
  init: function(){
    Node.prototype.init.call(this);

    // selectedPath.as(function(value){
    //   return wrapData(value);
    // }).attach(path.setChildNodes, path);
    debugger;
    trackerApi.setSelectedPath(this.setChildNodes.bind(this));
    // flowApi.channel.link(this, function(nodes){
    //   this.setChildNodes(nodes);
    // });
    // flowApi.init(this.setChildNodes.bind(this));
  }
});

//
// Tracking events
//
// var trackingList = new Node({
//   template: resource('./template/tracking-list.tmpl'),
//   childClass: {
//     template: resource('./template/tracking-event.tmpl'),
//     binding: {
//       event: 'data:event',
//       selector: 'data:selectorStr',
//       data: function(node){
//         return JSON.stringify(node.data.data, null, 2);
//       }
//     }
//   }
// });


module.exports = Node.subclass({
  disabled: api.connected.as(basis.bool.invert),
  active: true,
  template: templates.main,
  binding: {
    connected: api.connected,
    // rolesTree: rolesTree,
    path: 'satellite:',
    // trackingList: trackingList
    hasSubject: {
      events: 'update',
      getter: function(node){
        return Boolean(node.data.hasTarget);
      }
    }
  },
  action: {
    close: function(){
      // trackerApi.dropTarget();
      // debugger;
      // selectedDomNode.set();
    }
  },
  satellite: {
    path: Path
  },
  init: function(){
    Node.prototype.init.call(this);

    // this.showSource = new basis.Token(false);
    trackerApi.channel.link(this, this.update);
    api.connected.link(this, function(connected){
      if (connected)
        trackerApi.init(this.update.bind(this));
    });
  }
});

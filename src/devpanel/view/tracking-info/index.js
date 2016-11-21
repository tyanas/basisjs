var remote = require('../../remote.js');
var createDynamicView = require('../utils.js').createDynamicView;

var inspectBasis = require('devpanel').inspectBasis;
var inspectBasisTracker = inspectBasis.require('basis.tracker');
var inspectBasisDomEvent = inspectBasis.require('basis.dom.event');
var api = require('api');
var trackerApi = require('./api.js');

var wrapData = require('basis.data').wrap;
var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var Window = require('basis.ui.window').Window;
var selectedDomNode = new basis.Token(null);
var selectedPath = selectedDomNode.as(function(value){
  return inspectBasisTracker.getPathByNode(value);
});

var data = {
  input: selectedDomNode,
  output: new Value()
};

api
  .local(trackerApi, data)
  .channel(data.output, remote.send);

//
// Role path to node
//
var path = new Node({
  template: resource('./template/role-path.tmpl'),
  childClass: {
    template: resource('./template/role-path-part.tmpl'),
    binding: {
      role: function(node){
        return inspectBasisTracker.stringifyRole(node.data);
      }
    }
  }
});

selectedPath.as(function(value){
  return wrapData(value);
}).attach(path.setChildNodes, path);


//
// Tracking events
//
var trackingList = new Node({
  template: resource('./template/tracking-list.tmpl'),
  childClass: {
    template: resource('./template/tracking-event.tmpl'),
    binding: {
      event: 'data:event',
      selector: 'data:selectorStr',
      data: function(node){
        return JSON.stringify(node.data.data, null, 2);
      }
    }
  }
});

selectedPath.as(function(value){
  var list = inspectBasisTracker.getInfo(value);
  return list ? wrapData(list) : null;
}).attach(trackingList.setChildNodes, trackingList);


//
// Roles tree
//
var rolesTree = new Node({
  template: resource('./template/roles-tree.tmpl'),
  childClass: {
    childClass: basis.Class.SELF,
    template: resource('./template/roles-tree-leaf.tmpl'),
    selected: Value.from(selectedPath)
      .as(function(value){
        return inspectBasisTracker.stringifyPath(value);
      }).compute(function(node, path){
        return node.fullpath === path;
      }),
    binding: {
      matched: 'matched',
      role: function(node){
        return inspectBasisTracker.stringifyRole(node.data);
      }
    },
    action: {
      select: function(){
        selectedDomNode.set(this.node);
      }
    },
    handler: {
      select: function(){
        this.element.scrollIntoView(true);
      }
    }
  }
});

function updateRolesTree(node, path){
  if (!node)
    node = document.body;

  var role = node.getAttribute('role-marker');
  var result = [];

  if (!path)
    path = [];

  if (role)
    path = path.concat(role);

  for (var i = 0; i < node.childNodes.length; i++)
  {
    var child = node.childNodes[i];
    if (child.nodeType == 1 && !child.hasAttribute('basis-devpanel-ignore'))
      result.push.apply(result, updateRolesTree(child, path));
  }

  if (role)
    return [{
      fullpath: path.join(' '),
      matched: Boolean(inspectBasisTracker.getInfo(path)),
      node: node,
      data: inspectBasisTracker.parseRole(role),
      childNodes: result
    }];

  return result;
}

selectedDomNode.attach(function(value){
  rolesTree.setChildNodes(value ? updateRolesTree() : []);
});


//
// Main view
//

var captureEvents = [
  'click',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseenter',
  'mouseleave'
];


var View = require('./view/index.js');

var view = createDynamicView(data.input, View, {
  container: document.body
});


view.link(null, function(view, oldView){
  if (view)
  {
    captureEvents.forEach(function(eventName){
      inspectBasisDomEvent.captureEvent(eventName, function(){});
    });
  }
  else if (oldView)
  {
    captureEvents.forEach(function(eventName){
      inspectBasisDomEvent.releaseEvent(eventName);
    });
  }
});

module.exports = {
  view: view,
  set: data.input.set.bind(data.input)
};

var Node = require('basis.ui').Node;
var inspectBasisTracker = require('basis.tracker');// TODO api

module.exports = Node.subclass({
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

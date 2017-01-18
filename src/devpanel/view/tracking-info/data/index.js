var inspectBasis = require('devpanel').inspectBasis;
var inspectBasisTracker = inspectBasis.require('basis.tracker');
var inspectBasisDomEvent = inspectBasis.require('basis.dom.event');

var Value = require('basis.data').Value;
var Expression = require('basis.data.value').Expression;
var wrapData = require('basis.data').wrap;

var input = new Value(); // use Value since to be consistent
var selectedDomNode = new basis.Token(null);
// input.link(selectedDomNode, selectedDomNode.set);
input.link(selectedDomNode, function(node){
  this.set(node);
});

var selectedPath = selectedDomNode.as(function(value){
  return inspectBasisTracker.getPathByNode(value);
});

// selectedPath.as(function(value){
//   return wrapData(value);
// }).attach(path.setChildNodes, path);

var output = new Expression(
    selectedDomNode,
    selectedPath,
    function(node, path){
        return {
            setSelectedPath: function(id){
                debugger;
                id(wrapData(path));
            }
        };
    }
);

module.exports = {
  input: input,
  output: output
};

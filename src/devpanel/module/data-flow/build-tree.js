var fnInfo = require('basis.utils.info').fn;
var highlight = require('basis.utils.highlight').highlight;

function getNodeType(value, resolvers){
  return resolvers.isDataset(value) ? 'set' : null;
}

function inspectValue(value, resolvers, map){
  var sourceInfo = resolvers.getInfo(value, 'sourceInfo');

  if (!map)
    map = [];

  if (!sourceInfo)
  {
    var marker = map.indexOf(value) + 1;

    if (!marker)
      marker = map.push(value);

    return [{
      nodeType: getNodeType(value, resolvers),
      source: true,
      marker: marker,
      value: value,
      loc: resolvers.getInfo(value, 'loc')
    }];
  }

  var nodes = [];

  if (Array.isArray(sourceInfo.source))
    nodes = [{
      nodeType: 'split',
      childNodes: sourceInfo.source.map(function(value){
        return {
          childNodes: inspectValue(value, resolvers, map)
        };
      })
    }];
  else
    nodes = inspectValue(sourceInfo.source, resolvers, map);

  var fn = sourceInfo.transform;
  var fnLoc = resolvers.getInfo(fn, 'loc');
  var info = fn ? resolvers.fnInfo(fn) : { source: null };

  nodes.push({
    nodeType: getNodeType(value, resolvers),
    type: sourceInfo.type,
    events: sourceInfo.events,
    transform: info.getter || (fnLoc
      ? resolvers.getColoredSource(fnLoc, 0, 0, 20)
      : highlight(String(info.source), 'js', {
          wrapper: function(line){
            return '<div>' + line + '</div>';
          }
        })),
    // host: value,
    value: value.value,
    loc: resolvers.getInfo(value, 'loc')
  });

  return nodes;
}

module.exports = function buildTree(value, resolvers){
  var result = inspectValue(value, basis.object.extend({
    isDataset: basis.fn.$false,
    getInfo: basis.dev.getInfo,
    fnInfo: fnInfo,
    getColoredSource: require('basis.utils.source').getColoredSource
  }, resolvers));

  if (result.length)
    result[result.length - 1].initial = true;

  return result;
};

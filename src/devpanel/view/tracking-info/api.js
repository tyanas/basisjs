
module.exports = require('api').define('tracker', {
  setSelectedPath: function(data){
    return function(id){
        debugger;
        var setSelectedPath = data.output.value.setSelectedPath;
        if (typeof setSelectedPath == 'function')
            setSelectedPath(id);
    };
  },
  dropTarget: function(data){
    return function(){
      data.input.set();
    };
  }
});

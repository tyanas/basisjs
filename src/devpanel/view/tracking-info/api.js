module.exports = require('api').define('tracker', {
  dropTarget: function(data){
    return function(){
      data.input.set();
    };
  }
});

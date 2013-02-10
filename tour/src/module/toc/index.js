basis.require('basis.ui');
basis.require('app.type');

module.exports = new basis.ui.Node({
  dataSource: app.type.Page.all,
  active: true,

  template: resource('template/list.tmpl'),
  
  selection: {
    handler: {
      datasetChanged: function(){
        var page = this.pick();
        if (page)
          app.selectPage(page.root);
      }
    }
  },
  childClass: {
    active: true,
    template: resource('template/item.tmpl'),
    binding: {
      title: 'data:title'
    }
  }
});
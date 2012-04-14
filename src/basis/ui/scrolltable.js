/*!
 * Basis javascript library 
 * http://code.google.com/p/basis-js/
 *
 * @copyright
 * Copyright (c) 2006-2012 Roman Dvornov.
 *
 * @license
 * GNU General Public License v2.0 <http://www.gnu.org/licenses/gpl-2.0.html>
 *
 * @author
 * Roman Dvornov <rdvornov@gmail.com>
 * Vladimir Ratsev <wuzykk@gmail.com>
 *
 */

  'use strict';

  basis.require('basis.timer');
  basis.require('basis.dom');
  basis.require('basis.dom.event');
  basis.require('basis.cssom');
  basis.require('basis.layout');
  basis.require('basis.ui.table');


 /**
  * @namespace basis.ui.scrolltable
  */

  var namespace = this.path;


  //
  // import names
  //

  var Class = basis.Class;
  var DOM = basis.dom;
  var sender = basis.dom.event.sender;

  var cssom = basis.cssom;
  var Table = basis.ui.table.Table;
  var layout = basis.layout;


  //
  // main part
  //

  function resetStyle(extraStyle){
    return '[style="padding:0!important;margin:0!important;border:0!important;width:auto!important;height:0!important;font-size:0!important;' + (extraStyle || '') + '"]';
  }

  function buildCellsSection(owner, property){
    return DOM.createElement('tbody' + resetStyle(),
      DOM.createElement('tr' + resetStyle(),
        owner.columnWidthSync_.map(Function.getter(property))
      )
    );
  }

  function replaceTemplateNode(owner, refName, newNode){
    DOM.replace(owner.tmpl[refName],
      owner.tmpl[refName] = newNode
    );
  }

  // Cells proto
  var measureCell = DOM.createElement('td' + resetStyle(),
    DOM.createElement(resetStyle('position:relative!important'),
      DOM.createElement('iframe[event-load="measureInit"]' + resetStyle('width:100%!important;position:absolute!important;visibility:hidden!important;behavior:expression(basis.dom.event.fireEvent(window,\\"load\\",{type:\\"load\\",target:this}),(runtimeStyle.behavior=\\"none\\"))'))
    )
  );

  var expanderCell = DOM.createElement('td' + resetStyle(),
    DOM.createElement(resetStyle())
  );


 /**
  * @class
  */
  var ScrollTable = Class(Table, {
    className: namespace + '.ScrollTable',

    timer_: false,

   /**
    * Column width sync cells
    */
    columnWidthSync_: null,

   /**
    * @inheritDoc
    */
    template:
      '<div class="Basis-Table Basis-ScrollTable {selected} {disabled}" event-load="">' +
        '<div class="Basis-ScrollTable-Header-Container">' +
          '<table{headerOffset} class="Basis-ScrollTable-Header" cellspacing="0">' +
            '<!--{header}-->' +
            '<!--{headerExpandRow}-->' +
          '</table>' +
          '<div{headerExpandCell} class="Basis-ScrollTable-ExpandHeaderCell">' +
            '<div class="Basis-ScrollTable-ExpandHeaderCell-B1">' +
              '<div class="Basis-ScrollTable-ExpandHeaderCell-B2"/>' +
            '</div>' +
          '</div>'+
        '</div>' +
        '<div{scrollContainer} class="Basis-ScrollTable-ScrollContainer" event-scroll="scroll">' +
          '<div{boundElement} class="Basis-ScrollTable-TableWrapper">' +
            '<table{tableElement|groupsElement} class="Basis-ScrollTable-ContentTable" cellspacing="0">' +
              '<!--{shadowHeader}-->' +
              '<!--{measureRow}-->' +
              '<tbody{content|childNodesElement} class="Basis-Table-Body"/>' +
              '<!--{shadowFooter}-->' +
            '</table>' +
          '</div>' +
        '</div>' +
        '<div class="Basis-ScrollTable-Footer-Container">' +
          '<table{footerOffset} class="Basis-ScrollTable-Footer" cellspacing="0">' +
            '<!--{footer}-->' +
            '<!--{footerExpandRow}-->' +
          '</table>' +
          '<div{footerExpandCell} class="Basis-ScrollTable-ExpandFooterCell">' +
            '<div class="Basis-ScrollTable-ExpandFooterCell-B1">' +
              '<div class="Basis-ScrollTable-ExpandFooterCell-B2"/>' +
            '</div>' +
          '</div>'+
        '</div>' +
      '</div>',

    action: {
      scroll: function(){
        var scrollLeft = -this.tmpl.scrollContainer.scrollLeft + 'px';

        if (this.tmpl.headerOffset.style.left != scrollLeft)
        {
          this.tmpl.headerOffset.style.left = scrollLeft;
          this.tmpl.footerOffset.style.left = scrollLeft;
        }
      },
      measureInit: function(event){
        //console.log('load');
        (sender(event).contentWindow.onresize = this.requestRelayout)();
      }
    },

    headerClass: {
      listen: {
        childNode: {
          '*': function(event){
            if (this.owner)
              this.owner.requestRelayout();
          }
        }
      }
    },

   /**
    * @inheritDoc
    */
    init: function(config){
      this.requestRelayout = this.requestRelayout.bind(this);
      this.relayout = this.relayout.bind(this);

      // inherit
      Table.prototype.init.call(this, config);

      // add request to relayout on any header events
      this.header.addHandler({
        '*': this.requestRelayout
      }, this);

      // column width sync cells
      this.columnWidthSync_ = Array.create(this.columnCount, function(){
        return {
          measure: measureCell.cloneNode(true),
          header: expanderCell.cloneNode(true),
          footer: expanderCell.cloneNode(true)
        }
      });

      // insert measure row
      replaceTemplateNode(this, 'measureRow', buildCellsSection(this, 'measure'));

      // insert header expander row
      replaceTemplateNode(this, 'headerExpandRow', buildCellsSection(this, 'header'));

      // insert footer expander row
      replaceTemplateNode(this, 'footerExpandRow', buildCellsSection(this, 'footer'));

      //
      layout.addBlockResizeHandler(this.tmpl.boundElement, this.requestRelayout);

      // hack for ie, trigger relayout on create
      if (basis.ua.is('IE8')) // TODO: remove this hack
        setTimeout(this.requestRelayout, 1);
    },

   /**
    * Notify table that it must be relayout.
    */
    requestRelayout: function(){
      if (!this.timer_)
        this.timer_ = setTimeout(this.relayout, 0);
    },

   /**
    * Make relayout of table. Should never be used in common cases. Call requestRelayout instead.
    */
    relayout: function(){
      //console.log('relayout');

      var headerElement = this.header.element;
      var footerElement = this.footer.element;

      //
      // Sync header html
      //
      var headerOuterHTML = DOM.outerHTML(headerElement);
      if (this.shadowHeaderHTML_ != headerOuterHTML)
      {
        this.shadowHeaderHTML_ = headerOuterHTML;
        replaceTemplateNode(this, 'shadowHeader', headerElement.cloneNode(true));
      }

      //
      // Sync footer html
      //
      var footerOuterHTML = DOM.outerHTML(footerElement);
      if (this.shadowFooterHtml_ != footerOuterHTML)
      {
        this.shadowFooterHtml_ = footerOuterHTML;
        replaceTemplateNode(this, 'shadowFooter', footerElement.cloneNode(true));
      }

      //
      // Sync column width
      //
      for (var i = 0, column, columnWidth; column = this.columnWidthSync_[i]; i++)
      {
        columnWidth = column.measure.offsetWidth + 'px';
        cssom.setStyleProperty(column.header.firstChild, 'width', columnWidth);
        cssom.setStyleProperty(column.footer.firstChild, 'width', columnWidth);
        //column.header.firstChild.style.width = columnWidth;
        //column.footer.firstChild.style.width = columnWidth;
      }

      //
      // Calc metrics boxes
      //
      var tableWidth = this.tmpl.boundElement.offsetWidth || 0;
      var headerHeight = headerElement.offsetHeight || 0;
      var footerHeight = footerElement.offsetHeight || 0;

      //
      // Update style properties
      //
      this.tmpl.headerExpandCell.style.left = tableWidth + 'px';
      this.tmpl.footerExpandCell.style.left = tableWidth + 'px';
      this.tmpl.tableElement.style.margin = '-{0}px 0 -{1}px'.format(headerHeight, footerHeight);
      this.element.style.paddingBottom = (headerHeight + footerHeight) + 'px';

      // reset timer
      // it should be at the end of relayout to prevent relayout call while relayout
      this.timer_ = clearTimeout(this.timer_);
    },

   /**
    * @inheritDoc
    */
    destroy: function(){
      this.timer_ = clearTimeout(this.timer_);
      this.timer_ = true; // prevent relayout call

      this.columnWidthSync_ = null;
      this.shadowHeaderHtml_ = null;
      this.shadowFooterHtml_ = null;

      Table.prototype.destroy.call(this);
    }
  });


  //
  // export names
  //

  this.extend({
    ScrollTable: ScrollTable
  });

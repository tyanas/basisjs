/*!
 * Basis javasript library 
 * http://code.google.com/p/basis-js/
 *
 * @copyright
 * Copyright (c) 2006-2011 Roman Dvornov.
 *
 * @license
 * GNU General Public License v2.0 <http://www.gnu.org/licenses/gpl-2.0.html>
 */

  (function(){

   /**
    * @namespace Basis.Controls.Form
    */

    var namespace = 'Basis.Controls.Form';

    // import names

    var Class = Basis.Class;
    var Event = Basis.Event;
    var DOM = Basis.DOM;
    var Template = Basis.Html.Template;
    var Cleaner = Basis.Cleaner;

    var complete = Object.complete;
    var coalesce = Object.coalesce;
    var getter = Function.getter;
    var cssClass = Basis.CSS.cssClass;

    var nsWrappers = DOM.Wrapper;

    var Selection = nsWrappers.Selection;       
    var AbstractProperty = Basis.Data.Property.AbstractProperty;
    var Property = Basis.Data.Property.Property;
    var EventObject = Basis.EventObject;

    var Control = nsWrappers.Control;         
    var TmplNode = nsWrappers.TmplNode;        
    var TmplContainer = nsWrappers.TmplContainer;

    var createEvent = EventObject.createEvent;

    //
    // Main part
    //

    //
    //  Fields
    //

    var Field = Class(TmplNode, {
      className: namespace + '.Field',

      canHaveChildren: false,

      serializable: true,

      event_select: function(){
        DOM.focus(this.tmpl.field, true);

        TmplNode.prototype.event_select.call(this);
      },
      event_enable: function(){
        this.tmpl.field.removeAttribute('disabled');

        TmplNode.prototype.event_enable.call(this);
      },
      event_disable: function(){
        this.tmpl.field.setAttribute('disabled', 'disabled');

        TmplNode.prototype.event_disable.call(this);
      },
      event_change: createEvent('change'),
      event_keyup:  createEvent('keyup'),
      event_keypress: createEvent('keypress') && function(event){
        var event = Event(event);
        if (event)
        {
          var key = Event.key(event);
        
          if (key == Event.KEY.ENTER || key == Event.KEY.CTRL_ENTER)
          {
            Event.cancelDefault(event);
            this.nextFieldFocus();
          }
          else
            this.setValid();
        }

        EventObject.event.keypress.call(this, event);
      },
      event_focus: createEvent('focus') && function(event){
        if (this.valid)
          this.setValid();

        EventObject.event.focus.call(this, event);
      },        
      event_blur: createEvent('blur') && function(event){
        this.validate(true);

        EventObject.event.blur.call(this, event);
      },
      
      template: new Template(
        '<div{element|sampleContainer} class="Basis-Field">' +
          '<div class="Basis-Field-Title">' +
            '<label><span{title}/>{titleText}</label>' +
          '</div>' +
          '<div{fieldContainer|content} class="Basis-Field-Container"/>' +
        '</div>'
      ),

      init: function(config){
        TmplNode.prototype.init.call(this, config);

        // create field
        if (this.fieldTemplate)
        {
          this.fieldTemplate.createInstance(this.tmpl, this);

          if (this.tmpl.fieldContainer)
            DOM.insert(this.tmpl.fieldContainer, this.tmpl.field);

          this.childNodesElement = this.tmpl.childNodesElement || this.tmpl.element;
        }

        this.name = this.name || this.id;

        if (this.tmpl.titleText)
          this.tmpl.titleText.nodeValue = this.title || '';

        // attach button
        /*if (this.button)
        {
          cssClass(this.element).add('have-button');
          this.button = DOM.createElement('BUTTON', config.caption || '...');
          if (config.button.handler) 
            Event.addHandler(this.button, 'click', config.button.handler, this.button);
          DOM.insert(this.tmpl.field.parentNode, this.button, DOM.INSERT_AFTER, this.tmpl.field);
        }*/

        // set events
        if (this.tmpl.field)
        {
          Event.addHandler(this.tmpl.field, 'keyup',    this.keyup,    this);
          Event.addHandler(this.tmpl.field, 'keypress', this.keypress, this);
          Event.addHandler(this.tmpl.field, 'blur',     this.blur,     this);
          Event.addHandler(this.tmpl.field, 'focus',    this.focus,    this);
          Event.addHandler(this.tmpl.field, 'change',   this.change,   this);

          if (this.name)
            this.tmpl.field.name = this.name;

          if (this.size)
            this.tmpl.field.size = this.size;
        }

        if (!this.validators)
          this.validators = [];

        // set sample
        this.setSample(this.sample);
        
        // set min/max length
        if (this.minLength) this.setMinLength(this.minLength);
        if (this.maxLength) this.setMaxLength(this.maxLength);

        // set value & default value
        if (this.readOnly)
          this.setReadOnly(this.readOnly);
        
        if (this.disabled)
          this.disable();

        ;;;if (Function.$defined(config.returnValue) && typeof console != 'undefined') console.warn('Field.init: returnValue is deprecated');
        
        if (typeof this.value != 'undefined')
        {
          this.defaultValue = this.value;
          this.setDefaultValue();
        }
      },
      setReadOnly: function(readOnly){
        if (readOnly)
          this.tmpl.field.setAttribute('readonly', 'readonly', 0);
        else
          this.tmpl.field.removeAttribute('readonly', 0);
      },
      setDefaultValue: function(){
        if (typeof this.defaultValue != 'undefined')
        {
          this.setValue(this.defaultValue);
          this.setValid();
        }
      },
      setSample: function(sample){
        if (this.tmpl.sampleContainer && sample)
        {
          if (!this.sampleElement)
            DOM.insert(this.tmpl.sampleContainer, this.sampleElement = DOM.createElement('SPAN.Basis-Field-Sample', sample));
          else
            DOM.insert(DOM.clear(this.sampleElement), sample);
        }
        else
        {
          if (this.sampleElement)
          {
            DOM.remove(this.sampleElement);
            this.sampleElement = null;
          }
        }
      },
      getValue: function(){
        return this.tmpl.field.value;
      },
      setValue: function(newValue){
        this.tmpl.field.value = newValue || '';
        this.event_change();
      },
      disable: function(){
        if (!this.disabled)
        {
          this.disabled = true;
          this.event_disable();
        }
      },
      setMaxLength: function(len){
        this.maxLength = len;
      },
      setMinLength: function(len){
        this.minLength = len;
      },
      attachValidator: function(validator, validate){
        if (this.validators.add(validator) && validate)
          this.validate();
      },
      detachValidator: function(validator, validate){
        if (this.validators.remove(validator) && validate)
          this.validate();
      },
      change: function(){
        this.event_change();
      },
      keyup: function(event){
        this.event_keyup(event);
      },
      keypress: function(event){
        this.event_keypress(event);
      },
      blur: function(event){
        this.event_blur(event);
      },
      focus: function(event){
        this.event_focus(event);
      },
      select: function(){
        this.unselect();
        TmplNode.prototype.select.apply(this, arguments);
      },
      setValid: function(valid, message){
        if (typeof valid == 'boolean')
        {
          cssClass(this.element).bool('invalid', !valid).bool('valid', valid);
          if (message)
            this.element.title = message;
          else
            this.element.removeAttribute('title');
        }
        else
        {
          cssClass(this.element).remove('invalid', 'valid');
          this.element.removeAttribute('title');
        }
        this.valid = valid;
      },
      validate: function(onlyValid){
        var error;
        this.setValid();
        for (var i = 0; i < this.validators.length; i++)
          if (error = this.validators[i](this))
          {
            if (!onlyValid) 
              this.setValid(false, error.message);
            return error;
          }
        if (this.getValue() != '') // && this.validators.length)
          this.setValid(true);
        return;
      },
      nextFieldFocus: function(event){
        var next = DOM.axis(this, DOM.AXIS_FOLLOWING_SIBLING).search(true, 'selectable');
        if (next)
          next.select();
        else
          if (this.parentNode && this.parentNode.submit)
            this.parentNode.submit();
      },
      destroy: function(){
        Event.clearHandlers(this.element);// TODO: remove????
        Event.clearHandlers(this.tmpl.field);
        if (this.button)
        {
          Event.clearHandlers(this.button);
          delete this.button;
        }
        this.validators.clear();

        TmplNode.prototype.destroy.call(this);
        //this.inherit();

        delete this.sampleElement;
        delete this.sampleContainer;
        delete this.defaultValue;
        //delete this.field;
      }
    });
    Field.create = function(fieldType, config){
      var alias = {
        'radiogroup': 'RadioGroup',
        'checkgroup': 'CheckGroup'
      }

      fieldType = alias[fieldType.toLowerCase()] || fieldType.capitalize();

      if (Field[fieldType])
        return new Field[fieldType](config);
      else
        throw new Error('Wrong field type `{0}`'.format(fieldType));
    };

    //
    // Simple fields
    //

    Field.Hidden = Class(Field, {
      className: namespace + '.Field.Hidden',

      selectable: false,
      
      template: new Template(''),
      fieldTemplate: new Template(
        '<input{field|element} type="hidden"/>'
      )/*,

      init: function(config){
        this.value = this.value || '';

        Field.prototype.init.call(this, config);
      }*/
    });

    Field.Text = Class(Field, {
      className: namespace + '.Field.Text',
      
      fieldTemplate: new Template(
        '<input{field|element} type="text"/>'
      ),

      init: function(config){
        //this.value = this.value || '';

        Field.prototype.init.call(this, config);

        if (this.minLength)
          this.attachValidator(Validator.MinLength);
      },
      setMaxLength: function(len){
        len = len * 1 || 0;
        this.tmpl.field.setAttribute('maxlength', len, 0);
        
        Field.prototype.setMaxLength.call(this, len);
      }
    });

    Field.Password = Class(Field.Text, {
      className: namespace + '.Field.Password',

      fieldTemplate: new Template(
        '<input{field|element} type="password"/>'
      )
    });

    Field.File = Class(Field, {
      className: namespace + '.Field.File',

      fieldTemplate: new Template(
        '<input{field|element} type="file"/>'
      )/*,      

      init: function(config){
        config.value = '';
        
        Field.prototype.init.call(this, config);
      }*/
    });

    Field.Textarea = Class(Field, {
      className: namespace + '.Field.Textarea',

      nextFieldOnEnter: false,

      fieldTemplate: new Template(
        '<textarea{field|element}/>'
      ),

      event_keypress: EventObject.event.keypress,

      init: function(config){
        //this.value = this.value || '';
        this.counter = DOM.createElement('.counter', Field.LOCALE.Textarea.SYMBOLS_LEFT + ': ', DOM.createText(0));

        //inherit
        Field.prototype.init.call(this, config);

        if (this.minLength)
          this.attachValidator(Validator.MinLength);

        if (this.maxLength)
          this.attachValidator(Validator.MaxLength);

        Event.addHandler(this.tmpl.field, 'keyup', this.updateCounter, this);
        Event.addHandler(this.tmpl.field, 'input', this.updateCounter, this);

        if (window.opera)
        {
          Event.addHandler(this.tmpl.field, 'focus', function(event){
            this.contentEditable = true;
            this.contentEditable = false;
          });
      	}
      },
      updateCounter: function(){
        var left = this.maxLength - this.getValue().length;
        this.counter.lastChild.nodeValue = left >= 0 ? left : 0;
      },
      setValue: function(value){
        Field.prototype.setValue.call(this, value);
        this.updateCounter();
      },
      setMaxLength: function(len){
        Field.prototype.setMaxLength.call(this, len);

        if (len)
        {
          this.updateCounter();
          DOM.insert(this.tmpl.sampleContainer, this.counter);
        }
        else
          DOM.remove(this.counter);
      },
      destroy: function(){
        delete this.counter;
        
        Field.prototype.destroy.call(this);
      }
    });

    Field.Checkbox = Class(Field, {
      className: namespace + '.Field.Checkbox',

      value: false,

      template: new Template(
        '<div{element} class="Basis-Field Basis-Field-Checkbox">' +
          '<div{fieldContainer|content} class="Basis-Field-Container">' +
            '<label>' +
              '<input{field} type="checkbox"/>' +
              '<span>{titleText}</span>' +
            '</label>' +
          '</div>' +
        '</div>'
      ),
      fieldTemplate: null,
      /*fieldTemplate: new Template(
        '<input{field|element} type="checkbox"/>'
      ),*/

      /*init: function(config){
        this.value = this.value || false;

        //inherit
        Field.prototype.init.call(this, config);
      },*/
      invert: function(){
        this.setValue(!this.getValue());
      },
      setValue: function(value){
        var state = this.tmpl.field.checked;
        this.tmpl.field.checked = !!value;

        if (state != this.tmpl.field.checked)
          this.event_change();
      },
      getValue: function(){
        return this.tmpl.field.checked;
      }
    });

    Field.Label = Class(Field, {
      className: namespace + '.Field.Label',
      cssClassName: 'Basis-Field-Label',

      fieldTemplate: new Template(
        '<label{field|element}>{fieldValueText}</label>'
      ),
      setValue: function(newValue){
        Field.prototype.setValue.call(this, newValue);
        this.fieldValueText.nodeValue = this.tmpl.field.value;
      }
    });

    //
    // Complex fields
    //

    var ComplexFieldItem = Class(TmplNode, {
      className: namespace + '.ComplexField.Item',

      canHaveChildren: false,
      
      valueGetter: getter('value'),
      titleGetter: function(info){ 
        return info.title || info.value 
      },
      /*init: function(config){
        TmplNode.prototype.init.call(this, config);

        this.element.node = this;
      },*/
      getTitle: function(){
        return this.titleGetter(this.info, this);
      },
      getValue: function(){
        return this.valueGetter(this.info, this);
      }/*,
      destroy: function(){
        this.element.node = null;
        TmplNode.prototype.destroy.call(this);
      }*/
    });

    var COMBOBOX_SELECTION_HANDLER = {
      datasetChanged: function(){
        var values = this.selection.getItems().map(getter('getValue()'));
        this.setValue(!this.selection.multiple ? values[0] : values);
      }
    }

    var ComplexField = Class(Field, TmplContainer, {
      className: namespace + '.Field.ComplexField',

      canHaveChildren: true,

      childFactory: function(itemConfig){
        var config = {
          valueGetter: this.itemValueGetter,
          titleGetter: this.itemTitleGetter
        };

        if (itemConfig.info || itemConfig.delegate)
          complete(config, itemConfig);
        else
          config.info = itemConfig;

        return new this.childClass(config);
      },

      multipleSelect: false,

      itemValueGetter: getter('value'),
      itemTitleGetter: function(info){ return info.title || info.value; },

      init: function(config){

        this.selection = new Selection({ multiple: !!this.multipleSelect });
        this.selection.addHandler(COMBOBOX_SELECTION_HANDLER, this);

        //inherit
        Field.prototype.init.call(this, config);

        // insert items
        if (this.items)
          DOM.insert(this, this.items);

        this.setDefaultValue(); 

        Cleaner.add(this);
      },
      getValue: function(){
        var value = this.selection.getItems().map(getter('getValue()'));
        return !this.selection.multiple ? value[0] : value;
      },
      setValue: function(value/* value[] */){
        var source = this.multipleSelect ? Array.from(value) : [value];

        /*var source = this.selection.multiple 
          ? (value instanceof AbstractProperty
              ? Array.from(value.value).map(function(item){ return this.itemValueGetter(item.value) }, this)
              : Array.from(value)
            )
          : [value];*/

        var selected = {};
        source.forEach(function(key){ selected[key] = true });

        // prevent selection dispatch change event
        var selectedItems = [];
        for (var item = this.firstChild; item; item = item.nextSibling)
          if (selected[item.getValue()])
            selectedItems.push(item);

        this.selection.set(selectedItems);

        this.event_change();
      },
      destroy: function(){
        Field.prototype.destroy.call(this);

        Cleaner.remove(this);
      }
    });
    delete ComplexField.prototype.template;
    
    ComplexField.Item = ComplexFieldItem;

    //
    // Radio group
    //

    var RadioGroupItem = Class(ComplexFieldItem, {
      className: namespace + '.Field.RadioGroup.Item',

      event_select: function(){
        this.tmpl.field.checked = true;
        ComplexFieldItem.prototype.event_select.call(this);

        //cssClass(this.element).add('selected');
      },
      event_unselect: function(){
        this.tmpl.field.checked = false;
        ComplexFieldItem.prototype.event_unselect.call(this);
        //cssClass(this.element).remove('selected');
      },
      event_update: function(object, delta){
        this.tmpl.field.value = this.valueGetter(object.info, object);
        this.tmpl.titleText.nodeValue = this.titleGetter(object.info, object);

        ComplexFieldItem.prototype.event_update.call(this, object, delta);
      },

      template: new Template(
        '<label{element} class="Basis-RadioGroup-Item" event-click="select">' + 
          '<input{field} type="radio" class="radio"/>' +
          '<span{content}>{titleText}</span>' +
        '</label>'
      ),

      templateAction: function(actionName, event){
        if (actionName == 'select' && !this.isDisabled())
          this.select();

        ComplexFieldItem.prototype.templateAction.call(this, actionName, event);
      }/*,

      init: function(config){
        ComplexFieldItem.prototype.init.call(this, config);

        //this.event_update(this, {});
        //this.dispatch('update', this, this.info, this.info, {});
      }*/
    });

    Field.RadioGroup = Class(ComplexField, {
      className: namespace + '.Field.RadioGroup',

      childClass: RadioGroupItem,

      fieldTemplate: new Template(
        '<div{field|childNodesElement} class="Basis-RadioGroup"></div>'
      ),

      childFactory: function(config){
        var child = ComplexField.prototype.childFactory.call(this, config);
        child.tmpl.field.name = this.name;

        return child;
      }/*,

      init: function(config){
        ComplexField.prototype.init.call(this, config);

        //Event.addHandler(this.childNodesElement, 'click', this.change, this);
        Event.addHandler(this.childNodesElement, 'click', function(event){
          var sender = Event.sender(event);
          var item = sender.tagName == 'LABEL' ? sender : DOM.parent(sender, 'LABEL', 0, this.field);

          if (!item || !item.node) 
            return;

          if (!item.node.isDisabled())
          {
            var self = this;
            setTimeout(function(){
              self.dispatch('click', event, item.node);
              item.node.dispatch('click', event);
            }, 0);
          }

          Event.kill(event);
        }, this);

        //return config;
      },*/
      /*appendChild: function(newChild){
        if (newChild = this.inherit(newChild, refChild))
          newChild.field.name = this.name;
      },
      insertBefore: function(newChild, refChild){
        if (newChild = this.inherit(newChild, refChild))
          newChild.field.name = this.name;
      }*/
    });

    Field.RadioGroup.Item = RadioGroupItem;

    //
    // Check Group
    //

   /**
    * @class CheckGroupItem
    */

    var CheckGroupItem = Class(ComplexFieldItem, {
      className: namespace + '.Field.CheckGroup.Item',

      event_select: function(){
        this.tmpl.field.checked = true;
        ComplexFieldItem.prototype.event_select.call(this);
      },
      event_unselect: function(){
        this.tmpl.field.checked = false;
        ComplexFieldItem.prototype.event_unselect.call(this);
      },
      event_update: function(object, delta){
        this.tmpl.field.value = this.valueGetter(object.info, object);
        this.tmpl.titleText.nodeValue = this.titleGetter(object.info, object);

        ComplexFieldItem.prototype.event_update.call(this, object, delta);
      },

      template: new Template(
        '<label{element} event-click="click">' + 
          '<input{field} type="checkbox"/>' +
          '<span{content}>{titleText}</span>' +
        '</label>'
      ),
      templateAction: function(actionName, event){
        if (actionName == 'click' && !this.isDisabled())
        {
          var self = this;
          setTimeout(function(){
            if (self.selected)
              self.unselect();
            else
              self.select(self.parentNode.multipleSelect);
          }, 0);

          Event.kill(event);
        }

        ComplexFieldItem.prototype.templateAction.call(this, actionName, event);
      }
    });

   /**
    * @class Field.CheckGroup
    */

    Field.CheckGroup = Class(ComplexField, {
      className: namespace + '.Field.CheckGroup',

      childClass: CheckGroupItem,

      multipleSelect: true,

      fieldTemplate: new Template(
        '<div{field|childNodesElement} class="Basis-CheckGroup"></div>'
      )/*,

      init: function(config){
        config = this.inherit(config);

        Event.addHandler(this.childNodesElement, 'click', function(event){
          var sender = Event.sender(event);
          var item = sender.tagName == 'LABEL' ? sender : DOM.parent(sender, 'LABEL', 0, this.field);

          if (!item || !item.node) 
            return;

          if (!item.node.isDisabled())
          {
            var self = this;
            setTimeout(function(){
              self.dispatch('click', event, item.node);
              item.node.dispatch('click', event);
            }, 0);
          }

          Event.kill(event);
        }, this);

        return config;
      }*/
    });

    Field.CheckGroup.Item = CheckGroupItem;

    //
    // Select
    //

    var SelectItem = Class(ComplexFieldItem, {
      className: namespace + '.Field.Select.Item',

      event_select: function(){
        if (this.parentNode)
          this.parentNode.setValue(this.getValue());
      },
      event_unselect: function(){
        if (this.parentNode)
          this.parentNode.setValue();
      },
      event_update: function(object, delta){
        this.tmpl.field.value = this.valueGetter(object.info, object);
        this.tmpl.field.text = this.titleGetter(object.info, object);

        ComplexFieldItem.prototype.event_update.call(this, object, delta);
      },

      template: new Template(
        '<option{element|field}>{titleText}</option>'
      )
    });


    Field.Select = Class(ComplexField, {
      className: namespace + '.Field.Select',

      childClass: SelectItem,
      
      fieldTemplate: new Template(
        '<select{field|childNodesElement}/>'
      ),

      event_keyup: function(object, event){
        this.change();

        ComplexField.prototype.event_keyup.call(this, object, event);
      },

      setValue: function(value){
      	var item = this.childNodes.search(value, 'getValue()');
      	
        if (item)
          this.selection.set([item]);
        else
          this.selection.clear();
      }
    });

    Field.Select.Item = SelectItem;

    //
    //  Combobox
    //

    var ComboboxPopupHandler = {
      show: function(){ 
        cssClass(this.tmpl.field).add('Basis-DropdownList-Opened'); 
      },
      hide: function(){ 
        cssClass(this.tmpl.field).remove('Basis-DropdownList-Opened'); 
      }/*,
      click: function(event, node){
        var sender = Event.sender(event);
        var item = sender.tagName == 'A' ? sender : DOM.parent(sender, 'A', 0, this.content);

        if (!item || !item.node) 
          return;

        if (!item.node.isDisabled())
        {
          this.hide();

          this.dispatch('click', event, item.node);
          item.node.dispatch('click', event);
        }

        Event.kill(event);
      }*/
    };

    //
    // Combobox
    //

    var ComboboxItem = Class(ComplexFieldItem, {
      className: namespace + '.Field.Combobox.Item',

      /*click:  function(){
        this.select();
        //if (this.parentNode)
        //  this.parentNode.setValue(this.getValue());
      },*/
      event_update: function(object, delta){
        this.tmpl.titleText.nodeValue = this.titleGetter(object.info, object);

        ComplexFieldItem.prototype.event_update.call(this, object, delta);
      },

      template: new Template(
        '<a{element} class="Basis-Combobox-Item" href="#" event-click="click">{titleText}</a>'
      ),
      templateAction: function(actionName, event){
        if (actionName == 'click' && !this.isDisabled())
        {
          this.select();
          this.parentNode.hide();
          Event.kill(event);
        }

        ComplexFieldItem.prototype.templateAction.call(this, actionName, event);
      }
    });

    var ComboboxCaptionHandlers = {
      blur: function(){
        this.hide();
      },
      keyup: function(event){
        var key = Event.key(event);
        var cur = this.selection.pick();

        switch (key){
          case Event.KEY.DOWN:
            if (event.altKey)
              return this.popup.visible ? this.hide() : (!this.isDisabled() ? this.show() : null);

            //cur = cur ? cur.nextSibling : this.firstChild;
            cur = DOM.axis(cur ? cur : this.firstChild, DOM.AXIS_FOLLOWING_SIBLING).search(false, 'disabled');
          break;

          case Event.KEY.UP: 
            if (event.altKey)
              return this.popup.visible ? this.hide() : (!this.isDisabled() ? this.show() : null);

            cur = cur ? DOM.axis(cur, DOM.AXIS_PRESCENDING_SIBLING).search(false, 'disabled') : this.firstChild;
          break;
        }

        if (cur)
        {
          cur.select();
          DOM.focus(this.tmpl.field);
        }
      },
      keydown: function(event){
        var key = Event.key(event);
        if (key == Event.KEY.DOWN || key == Event.KEY.UP)
        {
          Event.kill(event);
        }
        else if (key == Event.KEY.ENTER)
        {
          if (this.popup.visible)
            this.hide();

          Event.kill(event);
        }
      }
    };
    
    Field.Combobox = Class(ComplexField, {
      className: namespace + '.Field.Combobox',

      childClass: ComboboxItem,

      event_enable: function(){
        if (this.delegate && this.delegate.select)
          this.delegate.select();

        ComplexField.prototype.event_enable.call(this);
      },
      event_update: function(object, delta){
        ComplexField.prototype.event_update.call(this, object, delta);
        // update title
        var title = this.getTitle() || this.getValue() || '';

        this.tmpl.field.title = 
        this.tmpl.captionText.nodeValue = this.captionFormater(title, this.getValue());
      },
      //}),

      caption: null,
      popup: null,
      property: null,
      
      selectedIndex: -1,

      captionFormater: Function.$self,
      
      /*fieldTemplate: new Template(
        '<div{field} class="Basis-DropdownList" event-click="click">' +
          '<div class="Basis-DropdownList-Content">' +
            '<a{caption} class="Basis-DropdownList-Caption" href="#">' +
              '<span class="Basis-DropdownList-CaptionText">{captionText}</span>' + 
            '</a>' +
            '<div class="Basis-DropdownList-Trigger"/>' +
          '</div>' +
          '<div{content|childNodesElement} class="Basis-DropdownList-PopupContent"/>' +
        '</div>'
      ),*/

      fieldTemplate: new Template(
        '<a{field} class="Basis-DropdownList" href="#" event-click="click">' +
          '<span class="Basis-DropdownList-Caption">{captionText}</span>' +
          '<span class="Basis-DropdownList-Trigger"/>' +
        '</a>' +
        '<div{content|childNodesElement} class="Basis-DropdownList-PopupContent"/>'
      ),

      templateAction: function(actionName, event){
        if (actionName == 'click')
        {
          if (this.isDisabled() || this.popup.visible) 
            this.hide() 
          else
            this.show({});

          Event.kill(event);
        }

        ComplexField.prototype.templateAction.call(this, actionName, event);
      },

      init: function(config){
        if (!Basis.Controls.Popup)
          throw new Error('Basis.Controls.Popup required for DropDownList');

        if (this.property)
          this.value = this.property.value;

        // inherit
        ComplexField.prototype.init.call(this, config);

        Event.addHandlers(this.tmpl.field, ComboboxCaptionHandlers, this);

        if (this.name)
          DOM.insert(this.tmpl.field, this.hidden = DOM.createElement('INPUT[type=hidden][name={0}]'.format(String(this.name).quote())));

        // create items popup
        var popupConfig = this.popup;
        this.popup = new Basis.Controls.Popup.Popup(complete({
          cssClassName: 'Basis-DropdownList-Popup',
          autorotate: 1,
          ignoreClickFor: [this.tmpl.field],
          thread: this.thread,
          content: this.childNodesElement
        }, popupConfig));
        
        this.popup.addHandler(ComboboxPopupHandler, this);

        /*if (items)
          DOM.insert(this, items);*/

        if (this.property)
          this.property.addLink(this, this.setValue); 

        /*if (typeof defaultValue != 'undefined')
          this.defaultValue = defaultValue;

        this.setDefaultValue();*/
        //this.dispatch('update', this, this.info);

        this.event_update(this);
      },
      /*select: function(){
        ComplexField.prototype.select.call(this);
        DOM.focus(this.tmpl.field);
      },*/
      show: function(){ 
        this.popup.show(this.tmpl.field); 
        this.select();
      },
      hide: function(){
        this.popup.hide();
      },
      getTitle: function(){
        return this.itemTitleGetter(this.info, this.delegate);
      },
      getValue: function(){
        return this.itemValueGetter(this.info, this.delegate);
      },
      setValue: function(value){
        /*if (value instanceof AbstractProperty)
          value = this.itemValueGetter(value.value);*/

        if (this.getValue() != value)
        {
          // update value & selection
          var item = this.childNodes.search(value, 'getValue()');
          if (!item || (!item.disabled && this.delegate !== item))
          {
            this.selectedIndex = item ? Array.lastSearchIndex : -1;

            this.setDelegate(item);
            if (item)
              this.selection.set([item]);
            else
              this.selection.clear();

            value = this.getValue();

            if (this.hidden)
              this.hidden.value = value;

            if (this.property)
              this.property.set(value);
          }
          this.event_change();
        }

        return this.getValue();
      },
      destroy: function(){

        if (this.property)
        {
          this.property.removeLink(this);
          delete this.property;
        }

        this.popup.destroy();
        delete this.popup;

        ComplexField.prototype.destroy.call(this);
      }
    });

    Field.Combobox.Item = ComboboxItem;

    //
    //  Value validators
    //

    var ValidatorError = Class(null, {
      className: namespace + '.ValidatorError',

      init: function(field, message){
        this.field = field;
        this.message = message;
      }
    });

    var Validator = {
      NO_LOCALE: 'There is no locale for this error',
      RegExp: function(regexp){
        if (regexp.constructor != RegExp)
          regexp = new RegExp(regexp);
        return function(field){
          var value = field.getValue();
          if (value != '' && !value.match(regexp))
            return new ValidatorError(field, Validator.LOCALE.RegExp.WRONG_FORMAT || Validator.NO_LOCALE);
        }
      },
      Required: function(field){
        var value = field.getValue();
        if (Function.$isNull(value) || value == '')
          return new ValidatorError(field, Validator.LOCALE.Required.MUST_BE_FILLED || Validator.NO_LOCALE);
      },
      Number: function(field){
        var value = field.getValue();
        if (isNaN(value))
          return new ValidatorError(field, Validator.LOCALE.Number.WRONG_FORMAT || Validator.NO_LOCALE);
      },
      Currency: function(field){
        var value = field.getValue();
        if (isNaN(value))
          return new ValidatorError(field, Validator.LOCALE.Currency.WRONG_FORMAT || Validator.NO_LOCALE);
        if (value <= 0)
          return new ValidatorError(field, Validator.LOCALE.Currency.MUST_BE_GREATER_ZERO || Validator.NO_LOCALE);
      },
      Email: function(field){
        var value = field.getValue();
        if (value != '' && !value.match(/\s*^[a-z0-9\.\-\_]+\@(([a-z][a-z0-9\-]*\.)+[a-z]{2,6}|(\d{1,3}\.){3}\d{1,3})\s*$/i))
          return new ValidatorError(field, Validator.LOCALE.Email.WRONG_FORMAT || Validator.NO_LOCALE);
      },
      Url: function(field){
        var value = field.getValue();
        if (value != '' && !value.match(/^\s*(https?\:\/\/)?((\d{1,3}\.){3}\d{1,3}|([a-zA-Z][a-zA-Z\d\-]+\.)+[a-zA-Z]{2,6})(:\d+)?(\/[^\?]*(\?\S(\=\S*))*(\#\S*)?)?\s*$/i))
          return new ValidatorError(field, Validator.LOCALE.Url.WRONG_FORMAT || Validator.NO_LOCALE);
      },
      MinLength: function(field){
        var value = field.getValue();
        var length = Function.$isNotNull(value.length) ? value.length : String(value).length;
        if (length < field.minLength)
          return new ValidatorError(field, (Validator.LOCALE.MinLength.MUST_BE_LONGER_THAN || Validator.NO_LOCALE).format(field.minLength));
      },
      MaxLength: function(field){
        var value = field.getValue();
        var length = Function.$isNotNull(value.length) ? value.length : String(value).length;
        if (length > field.maxLength)
          return new ValidatorError(field, (Validator.LOCALE.MaxLength.MUST_BE_SHORTER_THAN || Validator.NO_LOCALE).format(field.maxLength));
      }
    };

    //
    // FORM
    //

    /*var Form = Class(Control, {
      className: namespace + '.Form',
      
      canHaveChildren: false,
      
      template: new Template(
        '<form{element}/>'
      ),

      init: function(config){
        this.selection = false;

        Control.prototype.init.call(this, config);

        if (this.target)
          this.element.target = this.target;
          
        if (this.action)
          this.element.action = this.action;
          
        if (this.enctype)
          this.element.enctype = this.enctype;

        Event.addHandler(this.element, 'submit', this.submit, this);
        this.setMethod(this.method);

        this.element.onsubmit = this.submit;
        this.onSubmit = this.onSubmit || Function.$false;

        this.content = new FormContent(complete({ container: this.element, onSubmit: Function.$false }));
      },
      setData: function(data){
        ;;; if (typeof console != 'undefined') console.warn('Form.setData() method deprecated. Use Form.loadData() instead');
        this.loadData(data);
      },
      loadData: function(data){
        return this.content.loadData(data);
      },
      getFieldByName: function(name){
        return this.content.getFieldByName(name);
      },
      getFieldById: function(id){
        return this.content.getFieldById(id);
      },
      setMethod: function(method){
        this.element.method = method ? method.toUpperCase() : 'POST';
      },
      submit: function(){
        var result = (this.validate() === true) && !this.onSubmit();

        if (result)
          if (this.tagName == 'FORM')
            return false;
          else
            this.element.submit();
        
        return true;  
      },
      setDefaultState: function(){
        ;;; if (typeof console != 'undefined') console.warn('Form.setDefaultState() is deprecated. Use Form.reset() instead');
        return this.content.setDefaultState();
      },
      reset: function(){
        return this.content.reset();
      },
      validate: function(){
        return this.content.validate();
      },
      serialize: function(){
        return this.content.serialize();
      },

      appendChild: function(newChild){
        return this.content.appendChild(newChild);
      },
      removeChild: function(oldChild){
        return this.content.removeChild(oldChild);
      },
      insertBefore: function(newChild, refChild){
        return this.content.insertBefore(newChild, refChild);
      },
      replaceChild: function(newChild, oldChild){
        return this.content.replaceChild(newChild, oldChild);
      },
      clear: function(){
        return this.content.clear();
      }
    });*/

    var FormContent = Class(Control, {
      className: namespace + '.FormContent',
      
      canHaveChildren: true,
      childClass: Field,
      childFactory: function(config){
      	return Field.create(config.type || 'text', config);
      },

      onSubmit: Function.$false,

      event_reset: createEvent('reset'),
      event_disable: function(){
        for (var field = this.firstChild; field; field = field.nextSibling)
          if (!field.disabled)
            field.event_disable();

         Control.prototype.event_disable.call(this);
      },
      event_enable: function(){
        for (var field = this.firstChild; field; field = field.nextSibling)
          if (!field.disabled)
            field.event_enable();

        Control.prototype.event_enable.call(this);
      },
      
      template: new Template(
        '<div{element|content|childNodesElement} class="Basis-FormContent"/>'
      ),

      getFieldByName: function(name){
      	return this.childNodes.search(name, 'name');
      },
      getFieldById: function(id){
      	return this.childNodes.search(id, 'id');
      },
      serialize: function(){
        var result = {};
        for (var field = this.firstChild; field; field = field.nextSibling)
        {
          if (field.serializable && field.name)
            result[field.name] = field.getValue();
        }
        return result;
      },
      setData: function(data, withoutValidate){
        ;;; if (typeof console != 'undefined') console.warn('FormContent.setData() method deprecated. Use FormContent.loadData() instead');
        this.loadData(data, withoutValidate);
      },
      loadData: function(data, withoutValidate){
        var names = Object.keys(data);
        for (var field = this.firstChild; field; field = field.nextSibling)
        {
          if (names.indexOf(field.name) != -1)
            field.setValue(data[field.name]);
          else
            field.setDefaultValue();

          field.setValid();  // set undefined valid
        }
        if (!withoutValidate)
          this.validate();
      },
      setDefaultState: function(){
        ;;; if (typeof console != 'undefined') console.warn('FormContent.setDefaultState() is deprecated. Use FormContent.reset() instead');
        this.reset();
      },
      reset: function(){
        for (var field = this.firstChild; field; field = field.nextSibling)
          field.setDefaultValue();
        this.event_reset();
      },
      validate: function(){
        var error, errors = new Array();
        for (var field = this.firstChild; field; field = field.nextSibling)
        {
          if (error = field.validate())
            errors.push(error);
        }
        if (errors.length)
        {
          errors[0].field.select();
          return errors;
        }
        else
          return true;
      },
      submit: function(){
        if (this.validate() === true && this.onSubmit)
          this.onSubmit(this.serialize());
      }
    });

    var Form = Class(FormContent, {
      className: namespace + '.Form',
      
      template: new Template(
        '<form{element|formElement} class="Basis-Form">' +
          '<div{content|childNodesElement} class="Basis-FormContent"/>' +
        '</form>'
      ),

      init: function(config){
        this.selection = false;

        Control.prototype.init.call(this, config);

        if (this.target)
          this.formElement.target = this.target;
          
        if (this.action)
          this.formElement.action = this.action;
          
        if (this.enctype)
          this.formElement.enctype = this.enctype;

        Event.addHandler(this.formElement, 'submit', this.submit, this);

        this.formElement.onsubmit = this.submit;
                
        this.setMethod(this.method);
      },
      setMethod: function(method){
        this.formElement.method = method ? method.toUpperCase() : 'POST';
      },
      submit: function(){
        var result = (this.validate() === true) && !this.onSubmit();

        if (result)
          if (this.tagName == 'FORM')
            return false;
          else
            this.formElement.submit();
        
        return true;  
      }
    });

    // additional

    var MatchProperty = Class(Property, {
      matchFunction: function(child, reset){
        if (!reset)
        {
          var textNodes = child._m || this.textNodeGetter(child);

          if (textNodes.constructor != Array)
            textNodes = [ textNodes ];

          var hasMatches = false;

          for (var i = 0; i < textNodes.length; i++)
          {                             
            var textNode = textNodes[i];
            if (!textNode)
              continue;

            var hasMatch = false; 
            var p = textNode.nodeValue.split(this.rx);
            if (p.length > 1)
            {
              if (!child._x) 
                child._x = [];
              if (!child._m) 
                child._m = [];

              DOM.replace(
                child._x[i] || textNode,
                child._x[i] = DOM.createElement('SPAN.matched', DOM.wrap(p, this.map))
              );
              child._m[i] = textNode;
              hasMatches = true;
              hasMatch = true;
            }

            if (child._x && child._x[i] && !hasMatch)
            { 
               DOM.replace(child._x[i], child._m[i]);
               child._x[i] = child._m[i];
            }
          }

          return hasMatches;
        }

        if (child._x)
        {
          for (var i = 0; i < child._x.length; i++)
          {                             
            if (child._x[i])
               DOM.replace(child._x[i], child._m[i]);
          }
          delete child._x;
          delete child._m;
        }

        return false;
      },
      
      event_change: function(value){
        this.rx = this.regexpGetter(value);

        Property.prototype.event_change.call(this, value);
      },
      
      init: function(config){
        var startPoints = this.startPoints || '';

        this.textNodeGetter = getter(this.textNodeGetter || 'tmpl.titleText');

        if (typeof this.regexpGetter != 'function')
        {
          this.regexpGetter = function(value){ 
            return new RegExp('(' + startPoints + ')(' + value.forRegExp() + ')', 'i') 
          };
        }

        this.map = {};
        this.map[this.wrapElement || 'SPAN.match'] = function(v, i){ return (i % 3) == 2 };

        Property.prototype.init.call(this, '', this.handlers, String.trim);

        /*if (this.handlers)
          this.addHandler(this.handlers);*/
      }
    });

    var NodeMatchHandler = {
      childNodesModified: function(obj, delta){
        if (delta.inserted)
        {
          for (var i = 0, child; child = delta.inserted[i]; i++)
            this.matchFunction(child, this.value == '');
        }
      }
    }

    var Matcher = Class(MatchProperty, {
      event_change: function(value){
        MatchProperty.prototype.event_change.call(this, value);

        this.match();
      },
      
      init: function(config){
        MatchProperty.prototype.init.call(this, config);

        this.node.addHandler(NodeMatchHandler, this);
      },

      match: function(){
        for(var child = this.node.firstChild; child; child = child.nextSibling)
          this.matchFunction(child, this.value == '');
      }
    });

    var MatchFilter = Class(MatchProperty, {
      event_change: function(value){
        MatchProperty.prototype.event_change.call(this, value);

        this.node.setMatchFunction(value ? this.matchFunction.bind(this) : null);
      }
    });
    
    /*var MatchInputHandler = {
      keyup: function(){
        this.matchFilter.set(this.tmpl.field.value);
      },
      change: function(){
        this.matchFilter.set(this.tmpl.field.value);
      }
    };*/

    var MatchInput = Class(Field.Text, {
      cssClassName: 'Basis-MatchInput',

      matchFilterClass: MatchFilter,

      /*template: new Template(
        '<div{element|content} class="Basis-MatchInput">' +
          '<input{field} type="text"/>' +
        '</div>'
      ),*/

      event_keyup: function(event){
        this.matchFilter.set(this.tmpl.field.value);
        Field.Text.prototype.event_keyup.call(this, event);        
      },

      event_change: function(event){
        this.matchFilter.set(this.tmpl.field.value);
        Field.Text.prototype.event_change.call(this, event);        
      },

      init: function(config){
        Field.Text.prototype.init.call(this, config);
        
        this.matchFilter = new this.matchFilterClass(this.matchFilter);
        //Event.addHandlers(this.tmpl.field, MatchInputHandler, this);
      }/*,
      destroy: function(){
        Event.clearHandlers(this.tmpl.field);
        
        this.constructor.prototype.destroy.call(this);
      }*/
    });

    //
    // export names
    //

    Basis.namespace(namespace).extend({
      Form: Form,
      FormContent: FormContent,
      Field: Field,
      Validator: Validator,
      ValidatorError: ValidatorError,
      RadioGroup: Field.RadioGroup,
      CheckGroup: Field.CheckGroup,
      Combobox: Field.Combobox,
      ComplexField: ComplexField,
      Matcher: Matcher,
      MatchFilter: MatchFilter,
      MatchInput: MatchInput
    });

  })();

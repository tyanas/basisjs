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
 * Vladimir Ratsev <wuzykk@gmail.com>
 */

  'use strict';

  basis.require('basis.event');
  basis.require('basis.ui');
  basis.require('basis.animation');


 /**
  * @see ./demo/defile/scroller.html
  * @namespace basis.ui.scroller
  */

  var namespace = this.path;


  //
  // import names
  //

  var Class = basis.Class;

  var EventObject = basis.event.EventObject;
  var createEvent = basis.event.create;

  var DOM = basis.dom;
  var Event = basis.dom.event;

  var classList = basis.cssom.classList;

  var uiNode = basis.ui.Node;
  //
  // Main part
  //

  //css transform/transform3d feature detection
  var TRANSFORM_SUPPORT = false;
  var TRANSFORM_3D_SUPPORT = false;
  var TRANSFORM_PROPERTY_NAME;
  
  (function (){
    
    function testProps(element, properties) {
      var p;
      while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') 
          return p;
      }
      return false;
    }

    var tester = DOM.createElement('');

    TRANSFORM_PROPERTY_NAME = testProps(tester, [
      'transform',
      'WebkitTransform',
      'msTransform',
      'MozTransform',
      'OTransform'
    ]);

    if (TRANSFORM_PROPERTY_NAME)
      TRANSFORM_SUPPORT = true;

    //transform3d
    if (TRANSFORM_SUPPORT)
    {
      var prop = testProps(tester, [
        'perspectiveProperty', 
        'WebkitPerspective', 
        'MozPerspective', 
        'OPerspective', 
        'msPerspective'
      ]);

      if (prop || 'webkitPerspective' in document.documentElement.style)
        TRANSFORM_3D_SUPPORT = true;
    }
  })();


  //consts
  var AVARAGE_TICK_TIME_INTERVAl = 15;
  var VELOCITY_DECREASE_FACTOR = 0.94;
  var MOVE_THRESHOLD = 5;

 /**
  * @class
  */
  var Scroller = EventObject.subclass({
    className: namespace + '.Scroller',

    //className: namespace + '.Scroller',
    minScrollDelta: 0,
    scrollX: true,
    scrollY: true,

    event_start: createEvent('start', 'scrollerObject'),
    event_finish: createEvent('finish', 'scrollerObject'),
    event_startInertia: createEvent('startInertia', 'scrollerObject'),
    event_updatePosition: createEvent('updatePosition', 'scrollerObject', 'scrollPosition'),

    init: function(config){
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      this.currentVelocityX = 0;
      this.currentVelocityY = 0;

      this.currentDirectionX = 0;
      this.currentDirectionY = 0;

      this.viewportX = 0;
      this.viewportY = 0;

      this.viewportTargetX = this.viewportX;
      this.viewportTargetY = this.viewportY;

      //this.lastViewportTargetX = this.viewportX;
      //this.lastViewportTargetY = this.viewportY;
      if (this.minScrollDelta == 0)
      {
        this.minScrollDeltaYReached = true;
        this.minScrollDeltaXReached = true;
      }

      //time
      this.updateFrameHandle = 0;
      this.lastMotionUpdateTime = 0;
      this.lastUpdateTime = 0;
      this.startTime = 0;

      //statuses
      this.processInertia = false;
      this.panningActive = false;

      //init
      EventObject.prototype.init.call(this, config);

      if (this.targetElement)
      {
        Event.addHandler(this.targetElement, 'mousedown', this.onMouseDown, this);
        Event.addHandler(this.targetElement, 'touchstart', this.onMouseDown, this);
      }

      this.onUpdateHandler = this.onUpdate.bind(this);

      this.updateElementPosition = TRANSFORM_SUPPORT ? this.updatePosition_styleTransform : this.updatePosition_styleTopLeft;
    },
   
    updatePosition_styleTopLeft: function(){
      if (this.scrollX)
        this.targetElement.style.left = -(this.viewportX) + 'px';
      if (this.scrollY)
        this.targetElement.style.top = -(this.viewportY) + 'px';
    },

    updatePosition_styleTransform: function(){
      var deltaX = -(this.isUpdating ? this.viewportX : Math.round(this.viewportX)) + 'px';
      var deltaY = -(this.isUpdating ? this.viewportY : Math.round(this.viewportY)) + 'px';

      this.targetElement.style[TRANSFORM_PROPERTY_NAME] = 'translate(' + deltaX + ', ' + deltaY + ')' + (TRANSFORM_3D_SUPPORT ? ' translateZ(0)' : '');
    },

    resetVariables: function(){
      this.viewportTargetX = this.viewportX;
      this.viewportTargetY = this.viewportY;

      //this.lastViewportTargetX = this.viewportTargetX;
      //this.lastViewportTargetY = this.viewportTargetY;

      this.startX = this.viewportX;
      this.startY = this.viewportY;

      this.currentVelocityX = 0;
      this.currentVelocityY = 0;
      
      this.currentDirectionX = 0;
      this.currentDirectionY = 0;

      if (this.minScrollDelta != 0)
      {
        this.minScrollDeltaXReached = false;
        this.minScrollDeltaYReached = false;
      }
 
      this.processInertia = false;
    },

    startUpdate: function(){
      if (this.isUpdating)
        return;

      this.isUpdating = true;
      this.lastUpdateTime = Date.now();
      this.updateFrameHandle = this.nextFrame();

      this.event_start(this);
    },

    stopUpdate: function(){
      if (!this.isUpdating)
        return;

      this.resetVariables();

      this.isUpdating = false;
      cancelAnimationFrame(this.updateFrameHandle);

      this.updateElementPosition();

      this.event_finish(this);
    },

    onMouseDown: function(event){
      this.stopUpdate();

      this.panningActive = true;
      this.isMoved = false;

      this.lastMouseX = Event.mouseX(event);
      this.lastMouseY = Event.mouseY(event);

      this.lastMotionUpdateTime = Date.now();

      Event.addHandler(document, 'mousemove', this.onMouseMove, this);
      Event.addHandler(document, 'touchmove', this.onMouseMove, this);
      Event.addHandler(document, 'mouseup', this.onMouseUp, this);
      Event.addHandler(document, 'touchend', this.onMouseUp, this);

      //Event.cancelBubble(event);
      //Event.cancelDefault(event);
    },

    onMouseMove: function(event){
      if (this.minScrollDelta == 0 || this.minScrollDeltaYReached || this.minScrollDeltaXReached)
      {
        this.startUpdate();
      }

      var time = Date.now();
      var deltaTime = time - this.lastMotionUpdateTime;
      this.lastMotionUpdateTime = time;

      if (!deltaTime)
        return;
     
      if (this.minScrollDeltaXReached || !this.minScrollDeltaYReached)
      {

        var curMouseX = Event.mouseX(event)
        var deltaX = this.lastMouseX - curMouseX;
        this.lastMouseX = curMouseX;
        this.viewportTargetX += deltaX;

        if (!this.isMoved && Math.abs(this.startX - this.viewportTargetX) > MOVE_THRESHOLD)
          this.isMoved = true;
      }

      if (this.minScrollDeltaYReached || !this.minScrollDeltaXReached)
      {
        var curMouseY = Event.mouseY(event)
        var deltaY = this.lastMouseY - curMouseY;
        this.lastMouseY = curMouseY;
        this.viewportTargetY += deltaY;

        if (!this.isMoved && Math.abs(this.startY - this.viewportTargetY) > MOVE_THRESHOLD)
          this.isMoved = true;
      }

      if (this.minScrollDelta > 0)
      {
        if (!this.minScrollDeltaXReached && !this.minScrollDeltaYReached)
        {
          if (Math.abs(this.viewportTargetX - this.viewportX) > this.minScrollDelta)
            this.minScrollDeltaXReached = true;

          if (Math.abs(this.viewportTargetY - this.viewportY) > this.minScrollDelta)
            this.minScrollDeltaYReached = true;          

          if (this.minScrollDeltaYReached)
          {
            this.viewportTargetX = this.viewportX;
            this.currentDirectionX = 0;
          }

          if (this.minScrollDeltaXReached)
          {
            this.viewportTargetY = this.viewportY;
            this.currentDirectionY = 0;
          }
        }
      }

      Event.cancelDefault(event);
    },

    onMouseUp: function(){
      this.panningActive = false;
      this.processInertia = true;

      var timeNow = Date.now();
      var deltaTime = timeNow - this.lastMotionUpdateTime;
      deltaTime = Math.max(10, deltaTime); // low-timer granularity compensation
      this.lastMotionUpdateTime = 0;
      
      if (this.scrollX)
      {
        // 100msec is a full hold gesture that complete zeroes out the velocity to be used as inertia
        this.currentVelocityX *= 1 - Math.min(1, Math.max(0, deltaTime / 100));
      }

      if (this.scrollY)
        this.currentVelocityY *= 1 - Math.min(1, Math.max(0, deltaTime / 100));

      Event.removeHandler(document, 'mousemove', this.onMouseMove, this);
      Event.removeHandler(document, 'touchmove', this.onMouseMove, this);
      Event.removeHandler(document, 'mouseup',   this.onMouseUp, this);
      Event.removeHandler(document, 'touchend',  this.onMouseUp, this);

      this.event_startInertia(this);
    },

    onUpdate: function(time){
      if (!time)
        time = Date.now();

      var deltaTime = time - this.lastUpdateTime;
      this.lastUpdateTime = time;

      if (!deltaTime)
      {
        this.nextFrame();
        return;
      }

      if (this.panningActive)
      {
        var delta;

        if (this.scrollX)
        {
          delta = (this.viewportTargetX - this.viewportX/*this.lastViewportTargetX*/);
          //this.lastViewportTargetX = this.viewportTargetX;

          if (delta)
          {
            this.currentVelocityX = delta / deltaTime;
            this.currentDirectionX = delta == 0 ? 0 : (delta < 0 ? -1 : 1);
          }
        }

        if (this.scrollY)
        {
          delta = (this.viewportTargetY - this.viewportY/*this.lastViewportTargetY*/);
          //this.lastViewportTargetY = this.viewportTargetY;

          if (delta)
          {
            this.currentVelocityY = delta / deltaTime;
            this.currentDirectionY = delta == 0 ? 0 : (delta < 0 ? -1 : 1);
          }
        }
      }
      else if (this.processInertia)
      {
        if (this.scrollX)
        {
          this.viewportTargetX += (this.currentVelocityX *  deltaTime);
          this.currentVelocityX *= VELOCITY_DECREASE_FACTOR;
        }
        if (this.scrollY)
        {
          this.viewportTargetY += (this.currentVelocityY *  deltaTime);
          this.currentVelocityY *= VELOCITY_DECREASE_FACTOR;
        }
      }

      var deltaX = 0;
      var deltaY = 0;

      if (this.scrollX)
      {
        deltaX = (this.viewportTargetX - this.viewportX);
        var smoothingFactorX = this.panningActive || Math.abs(this.currentVelocityX) > 0 ? 1 : 0.12;
        this.viewportX += deltaX * smoothingFactorX;
      }
      if (this.scrollY)
      {
        deltaY = (this.viewportTargetY - this.viewportY);
        var smoothingFactorY = this.panningActive || Math.abs(this.currentVelocityY) > 0 ? 1 : 0.12;
        this.viewportY += deltaY * smoothingFactorY;
      }

      var scrollXStop = !this.scrollX || (/*this.currentVelocityX < 0.01 &&*/ Math.abs(deltaX) < 0.5);
      var scrollYStop = !this.scrollY || (/*this.currentVelocityY < 0.01 &&*/ Math.abs(deltaY) < 0.5);

      if (!this.panningActive && scrollXStop && scrollYStop)
      {
        if (this.scrollX)
          this.viewportX = this.viewportTargetX;

        if (this.scrollY)
          this.viewportY = this.viewportTargetY;

        this.stopUpdate();
      }

      this.updateElementPosition();
      this.event_updatePosition(this, time, this.viewportX, this.viewportY);

      this.nextFrame();
    },

    nextFrame: function(){
      if (this.isUpdating)
        this.updateFrameHandle = requestAnimationFrame(this.onUpdateHandler, this.targetElement);
    },

    setPosition: function(positionX, positionY, instantly){
      this.setPositionX(positionX, !instantly);
      this.setPositionY(positionY, !instantly);      
    },

    setPositionX: function(positionX, smooth){
      if (smooth)
      {
        this.viewportTargetX = positionX || 0;
        this.currentVelocityX = 0;
        this.startUpdate();
      }
      else
      {
        this.stopUpdate();
        this.viewportX = positionX;
        this.viewportTargetX = positionX;
        this.updateElementPosition();
      }
    },

    setPositionY: function(positionY, smooth){
      if (smooth)
      {
        this.viewportTargetY = positionY || 0;
        this.currentVelocityY = 0;
        this.startUpdate();
      }
      else
      {
        this.stopUpdate();
        this.viewportY = positionY;
        this.viewportTargetY = positionY;
        this.updateElementPosition();
      }
    },

    calcExpectedPosition: function(axis){
      var expectedInertiaDelta = 0;

      var currentVelocity = axis == 'x' ? this.currentVelocityX : this.currentVelocityY;
      var currentDirection = currentVelocity > 0 ? 1 : -1; //axis == 'x' ? this.currentDirectionX : this.currentDirectionY;
      var viewportTargetPosition = axis == 'x' ? this.viewportTargetX : this.viewportTargetY;

      if (currentVelocity)
      {
        var expectedInertiaIterationCount = Math.log(0.001 / Math.abs(currentVelocity)) / Math.log(VELOCITY_DECREASE_FACTOR);
        var velocity = currentVelocity;
        for (var i = 0; i < expectedInertiaIterationCount; i++)
        {
          expectedInertiaDelta += velocity * AVARAGE_TICK_TIME_INTERVAl;
          velocity *= VELOCITY_DECREASE_FACTOR;
        }
      }
      var expectedPosition = viewportTargetPosition + expectedInertiaDelta;

      return expectedPosition;
    },
    calcExpectedPositionX: function(){
      return this.calcExpectedPosition('x');
    },
    calcExpectedPositionY: function(){
      return this.calcExpectedPosition('y');
    }
  });

 /**
  * @class
  */
  var Scrollbar = uiNode.subclass({
    className: namespace + '.Scrollbar',

    cssClassName: 'Basis-ScrollPanel-Scrollbar',

    template: 
      '<div class="Basis-Scrollbar {selected} {disabled}">' +
        '<div{trackElement} class="Basis-Scrollbar-Track"></div>' +
      '</div>',

    listen: {
      owner: {
        realign: function(){
          this.realign();
        },
        updatePosition: function(){
          if (!this.trackSize)
            this.realign();

          var scrollPosition = this.getScrollbarPosition();
 
          if (scrollPosition > 1)
            scrollPosition = 1 + (scrollPosition - 1) * 3;
          if (scrollPosition < 0)
            scrollPosition *= 3;

          var startPosition = Math.max(0, Math.min(this.trackSize  * scrollPosition, this.scrollbarSize - 4));
          var endPosition = Math.max(0, Math.min(this.trackSize - this.trackSize  * scrollPosition, this.scrollbarSize - 4));

          var style = {};
          style[this.startProperty] = startPosition + 'px';
          style[this.endProperty] = endPosition + 'px';
          
          DOM.setStyle(this.tmpl.trackElement, style);
        }
      }
    },
    realign: function(){
      this.scrollbarSize = this.getScrollbarSize();
      this.trackSize = this.scrollbarSize - this.scrollbarSize * this.getScrollbarPart();
    },
    getScrollbarSize: Function.$null,
    getScrollbarPart: Function.$null,
    getScrollbarPosition: Function.$null
  });

  /**
   * @class
   */
  var HorizontalScrollbar = Scrollbar.subclass({
    className: namespace + '.HorizontalScrollbar',
    cssClassName: 'horizontal',
    startProperty: 'left',
    endProperty: 'right',
    getScrollbarSize: function(){
      return this.element.offsetWidth;
    },
    getScrollbarPart: function(){
      return this.owner.element.offsetWidth / (this.owner.maxPositionX - this.owner.minPositionX + this.owner.element.offsetWidth);
    },
    getScrollbarPosition: function(){
      return (this.owner.scroller.viewportX - this.owner.minPositionX) / (this.owner.maxPositionX - this.owner.minPositionX);      
    }
  });

  /**
   * @class
   */
  var VerticalScrollbar = Scrollbar.subclass({
    className: namespace + '.VerticalScrollbar',
    cssClassName: 'vertical',
    startProperty: 'top',
    endProperty: 'bottom',
    getScrollbarSize: function(){
      return this.element.offsetHeight;
    },
    getScrollbarPart: function(){
      return this.owner.element.offsetHeight / (this.owner.maxPositionY - this.owner.minPositionY + this.owner.element.offsetHeight);
    },
    getScrollbarPosition: function(){
      return (this.owner.scroller.viewportY - this.owner.minPositionY) / (this.owner.maxPositionY - this.owner.minPositionY);      
    }
  });

 /**
  * @class
  */
  var ScrollPanel = Class(basis.ui.Container, {
    className: namespace + '.ScrollPanel',

    useScrollbars: true,
    scrollX: true, 
    scrollY: true,
    wheelDelta: 40,

    event_realign: createEvent('realign'),
    event_updatePosition: createEvent('updatePosition'),

    template: 
      '<div class="Basis-ScrollPanel" event-mousewheel="onwheel">' +
        '<div{scrollElement|childNodesElement|content} class="Basis-ScrollPanel-Content {selected} {disabled}"/>' +
        '<!--{horizontalScrollbar}-->' +
        '<!--{verticalScrollbar}-->' +
      '</div>',

    binding: {
      horizontalScrollbar: 'satellite:',
      verticalScrollbar: 'satellite:'
    },

    action: {
      onwheel: function(event){
        var delta = Event.wheelDelta(event);

        if (this.scrollY)
          this.scroller.setPositionY(this.scroller.viewportTargetY - this.wheelDelta * delta, true);
        else if (this.scrollX)
          this.scroller.setPositionX(this.scroller.viewportTargetX - this.wheelDelta * delta, true);

        Event.kill(event);
      }
    },

    satelliteConfig: {
      horizontalScrollbar: {
        instanceOf: HorizontalScrollbar,
        existsIf: function(object){
          return object.useScrollbars && object.scrollX;
        }
      },
      verticalScrollbar: {
        instanceOf: VerticalScrollbar,
        existsIf: function(object){
          return object.useScrollbars && object.scrollY;
        }
      }
    },

    init: function(config){
      basis.ui.Node.prototype.init.call(this, config);

      //init variables
      this.minPositionX = 0;
      this.minPositionY = 0;

      this.maxPositionX = 0;
      this.maxPositionY = 0;

      // create scroller
      var scrollerConfig = Object.extend(this.scroller || {}, {
        targetElement: this.tmpl.scrollElement,
        scrollX: this.scrollX,
        scrollY: this.scrollY
      });

      this.scroller = new Scroller(scrollerConfig);

      this.scroller.addHandler({
        updatePosition: this.updatePosition,
        start: function(){
          if (!this.maxPositionX && !this.maxPositionY)
            this.realign();

          classList(this.element).add('scrollProcess');
        },
        finish: function(){
          classList(this.element).remove('scrollProcess');
        }
      }, this);

      classList(this.element).bool('bothScrollbars', this.scrollX && this.scrollY);

      // add resize handler
      basis.layout.addBlockResizeHandler(this.tmpl.scrollElement, this.realign.bind(this));
    },

    updatePosition: function(){
      if (!this.scroller.panningActive)
        this.fixPosition();

      this.event_updatePosition(this);
    },

    fixPosition: function(){
      var scroller = this.scroller;

      if (this.scrollX && (scroller.viewportX < this.minPositionX || scroller.viewportX > this.maxPositionX))
      {
        var positionX = Math.min(this.maxPositionX, Math.max(this.minPositionX, scroller.viewportX));
        scroller.setPositionX(positionX, true);
      }

      if (this.scrollY && (scroller.viewportY < this.minPositionY || scroller.viewportY > this.maxPositionY))
      {
        var positionY = Math.min(this.maxPositionY, Math.max(this.minPositionY, scroller.viewportY));
        scroller.setPositionY(positionY, true);
      }
    },

    realign: function(){
      if (this.element.offsetWidth)
      {
        this.calcDimensions();
        this.updatePosition();
        this.event_realign();
      }
    },
    
    calcDimensions: function(){
      if (this.scrollX)
      {
        var containerWidth = this.element.offsetWidth;
        var scrollWidth = this.tmpl.scrollElement.scrollWidth;
        this.maxPositionX = Math.max(0, scrollWidth - containerWidth);
      }

      if (this.scrollY)
      {
        var containerHeight = this.element.offsetHeight;
        var scrollHeight = this.tmpl.scrollElement.scrollHeight;
        this.maxPositionY = Math.max(0, scrollHeight - containerHeight);
      }
    },

    destroy: function(){
      this.scroller.destroy();

      basis.ui.Node.prototype.destroy.call(this);
    }
  });

 /**
  * @class
  */
  var ScrollGallery = ScrollPanel.subclass({
    className: namespace + '.ScrollGallery',
    scrollX: false,
    scrollY: false,
    childTransform: Function.$null,
  
    selection: true,

    action: {
      onwheel: function(event){
        var delta = Event.wheelDelta(event);

        var selected = this.selection.pick();
        var nextChild = delta == -1 ? selected.nextSibling : selected.previousSibling;
        
        if (nextChild)
          nextChild.select();
          
        Event.kill(event);
      }
    },

    event_childNodesModified: function(object, delta){
      ScrollPanel.prototype.event_childNodesModified.call(this, object, delta);

      if (this.scroller && this.childNodes.length == delta.inserted.length)
      {
        this.scrollToChild(this.firstChild, true);
        this.firstChild.select();
      }
    },

    childClass: uiNode.subclass({
      template: 
        '<div class="{selected} {disabled}" event-click="select"/>',

      action: {
        select: function(){
          if (!this.parentNode.scroller.isMoved)
            this.select();
        }
      },

      event_select: function(){
        uiNode.prototype.event_select.apply(this, arguments);
        this.parentNode.scrollToChild(this);
      }
    }),

    init: function(config){
      ScrollPanel.prototype.init.call(this, config);

      this.scroller.addHandler({
        startInertia: this.adjustPosition
      }, this);

      if (this.childTransform != Function.$null)
      {
        this.scroller.addHandler({
          updatePosition: this.applyPosition
        }, this);
      }

      if (!this.selection.itemCount && this.firstChild)
      {
        this.firstChild.select();
        this.scrollToChild(this.firstChild, true);
      }
    },                         

    setPosition: function(position, instantly){
      if (this.scrollX)
        this.scroller.setPositionX(position, !instantly);
      else 
        this.scroller.setPositionY(position, !instantly);
    },

    adjustPosition: function(){
      var childSize = this.scrollX ? this.firstChild.element.offsetWidth : this.firstChild.element.offsetHeight;
      var startPosition = (this.scrollX ? this.element.offsetWidth : this.element.offsetHeight) / 2;

      var newPosition = startPosition - childSize / 2 + this.calcExpectedPosition();
  
      var childScrollTo = Math.max(0, Math.min(this.childNodes.length - 1, Math.round(newPosition / childSize)));
      this.scrollToChild(this.childNodes[childScrollTo]);
    },

    applyPosition: function(){
      var childSize = this.scrollX ? this.firstChild.element.offsetWidth : this.firstChild.element.offsetHeight;
      var startPosition = this.scrollX ? this.element.offsetWidth / 2 : this.element.offsetHeight / 2;

      var newPosition = startPosition - childSize / 2 + (this.scroller.viewportX || this.scroller.viewportY);

      var closestChildPos = Math.floor(newPosition / childSize);
      var offset = newPosition / childSize - closestChildPos;

      var closeness;
      for (var i = 0, child; child = this.childNodes[i]; i++)
      {
        closeness = i == closestChildPos ? 1 - offset : (i == closestChildPos + 1 ? offset : 0);
        this.childTransform(child, closeness);  
      }
    },

    scrollToChild: function(child, instantly){
      var startPosition = this.scrollX ? this.element.offsetWidth / 2 : this.element.offsetHeight / 2;
      var childPosition = this.scrollX ? child.element.offsetLeft : child.element.offsetTop;
      var childSize = this.scrollX ? child.element.offsetWidth : child.element.offsetHeight;

      //console.log(childPosition + childSize / 2 - startPosition);
      this.setPosition(childPosition + childSize / 2 - startPosition, instantly);
    },

    calcDimensions: function(){
      ScrollPanel.prototype.calcDimensions.call(this);

      if (this.scrollX)
      {
        this.minPositionX = (this.firstChild ? this.firstChild.element.offsetWidth / 2 : 0) - this.element.offsetWidth / 2;
        this.maxPositionX = this.maxPositionX + this.element.offsetWidth / 2 - (this.lastChild ? this.lastChild.element.offsetWidth / 2 : 0);
      }

      if (this.scrollY)
      {
        this.minPositionY = (this.firstChild ? this.firstChild.element.offsetHeight / 2 : 0) - this.element.offsetHeight / 2;
        this.maxPositionY = this.maxPositionY + this.element.offsetHeight / 2 - (this.lastChild ? this.lastChild.element.offsetHeight / 2 : 0);
      }
    },

    calcExpectedPosition: function(){
      return this.scroller.calcExpectedPosition(this.scrollX ? 'x' : 'y');
    }
  });


  //
  // export names
  //

  this.extend({
    Scroller: Scroller,
    Scrollbar: Scrollbar,
    ScrollPanel: ScrollPanel,
    ScrollGallery: ScrollGallery
  });

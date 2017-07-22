var subscriptionConfig = {};
var subscriptionSeed = 1;
var maskConfig = {};

function mixFunctions(fnA, fnB){
  return function(){
    fnA.apply(this, arguments);
    fnB.apply(this, arguments);
  };
}

/**
* @enum {number}
*/
var SUBSCRIPTION = {
  NONE: 0,
  ALL: 0,

  /**
  * Register new type of a subscription with custom handler and custom action
  * @param {string} name
  * @param {Object} handler
  * @param {function()} action
  */
  add: function(name, handler, action){
    subscriptionConfig[subscriptionSeed] = {
      handler: handler,
      action: action
    };

    SUBSCRIPTION[name] = subscriptionSeed;
    SUBSCRIPTION.ALL |= subscriptionSeed; // binary `or`

    subscriptionSeed <<= 1; // `value <<= N` is equivalent to `value = value * 2^N`
    // Код свойства – это числовое значение, которое определяется единственным битом
    // на определенной позиции. Таким образом, чтобы определить подписку
    // на несколько свойств, необходимо сложить соответствующие свойству коды
    // (или использовать оператор бинарного "или" `|`)
  },

  /**
  * Register new type of a subscription with standard handler and standard action
  * @param {string} propertyName Name of a property for a subscription. The property
  *   should be an instance of a {basis.data.AbstractData} class.
  * @param {string=} eventName Name of an event which is fired when the property changes.
  *   If omitted it will be equal to the property name with 'Changed' suffix.
  */
  addProperty: function(propertyName, eventName){
    var handler = {};
    handler[eventName || propertyName + 'Changed'] = function(object, oldValue){
      if (oldValue)
        SUBSCRIPTION.unlink(propertyName, object, oldValue);

      if (object[propertyName])
        SUBSCRIPTION.link(propertyName, object, object[propertyName]);
    };

    this.add(propertyName.toUpperCase(), handler, function(fn, object){
      if (object[propertyName])
        fn(propertyName, object, object[propertyName]);
    });
  },

  /**
  * Return descriptor for subscription mask.
  * @param {number} mask
  */
  getMaskConfig: function(mask){
    var config = maskConfig[mask];

    if (!config)
    {
      var actions = [];
      var handler = {};
      var idx = 1;

      config = maskConfig[mask] = {
        actions: actions,
        handler: handler
      };

      while (mask)
      {
        if (mask & 1)
        {
          var cfg = subscriptionConfig[idx];

          actions.push(cfg.action);

          for (var key in cfg.handler)
            handler[key] = handler[key]
              ? mixFunctions(handler[key], cfg.handler[key])  // supposedly it will never be used, but do double check to make sure we miss no handler here
              : cfg.handler[key];
        }
        idx <<= 1;
        mask >>= 1;
      }
    }

    return config;
  },

  /**
  * Link objects connected by subscription.
  * @param {string} type
  * @param {basis.data.AbstractData} from
  * @param {basis.data.AbstractData} to
  */
  link: function(type, from, to){
    var subscriberId = type + from.basisObjectId;
    var subscribers = to.subscribers_;

    if (!subscribers)
      subscribers = to.subscribers_ = {};

    if (!subscribers[subscriberId])
    {
      subscribers[subscriberId] = from;

      var count = to.subscriberCount += 1;
      if (count == 1)
        to.emit_subscribersChanged(+1);
    }
    else
    {
      /** @cut */ basis.dev.warn('Attempt to add duplicate subscription');
    }
  },

  /**
  * Break link between objects connected by subscription.
  * @param {string} type
  * @param {basis.data.AbstractData} from
  * @param {basis.data.AbstractData} to
  */
  unlink: function(type, from, to){
    var subscriberId = type + from.basisObjectId;
    var subscribers = to.subscribers_;

    if (subscribers && subscribers[subscriberId])
    {
      delete subscribers[subscriberId];

      var count = to.subscriberCount -= 1;
      if (count == 0)
      {
        to.emit_subscribersChanged(-1);
        to.subscribers_ = null;
      }
    }
    else
    {
      /** @cut */ basis.dev.warn('Trying to remove a non-existent subscription');
    }
  },


  /**
  * Add subscription to object.
  * @param {basis.data.Emitter} object
  * @param {number} mask
  */
  subscribe: function(object, mask){
    var config = this.getMaskConfig(mask);

    for (var i = 0, action; action = config.actions[i]; i++)
      action(SUBSCRIPTION.link, object);

    object.addHandler(config.handler);
  },

  /**
  * Remove subscription from object.
  * @param {basis.data.Emitter} object
  * @param {number} mask
  */
  unsubscribe: function(object, mask){
    var config = this.getMaskConfig(mask);

    for (var i = 0, action; action = config.actions[i++];)
      action(SUBSCRIPTION.unlink, object);

    object.removeHandler(config.handler);
  },

  /**
  * Change object subscription.
  * @param {basis.data.AbstractData} object
  * @param {number} oldSubscriptionType
  * @param {number} newSubscriptionType
  */
  changeSubscription: function(object, oldSubscriptionType, newSubscriptionType){
    var delta = oldSubscriptionType ^ newSubscriptionType;

    if (delta)
    {
      var curConfig = SUBSCRIPTION.getMaskConfig(oldSubscriptionType);
      var newConfig = SUBSCRIPTION.getMaskConfig(newSubscriptionType);

      object.removeHandler(curConfig.handler);
      object.addHandler(newConfig.handler);

      var idx = 1;
      while (delta)
      {
        if (delta & 1)
        {
          var cfg = subscriptionConfig[idx];
          if (oldSubscriptionType & idx)
            cfg.action(SUBSCRIPTION.unlink, object);
          else
            cfg.action(SUBSCRIPTION.link, object);
        }
        idx <<= 1;
        delta >>= 1;
      }
    }
  }
};

module.exports = SUBSCRIPTION;

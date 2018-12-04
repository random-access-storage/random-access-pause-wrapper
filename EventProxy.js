'use strict'
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

module.exports = EventProxy

function EventProxy (proxied) {
  this._listening = {}
  this._ownEvents = {}
  this._proxied = proxied
}

inherits(EventProxy, EventEmitter)

Object.assign(EventProxy.prototype, {
  _initEventProxy: function (eventName) {
    if (this._ownEvents[eventName]) return

    // Already listening to proxied event
    if (this._listening[eventName] !== undefined) return

    var self = this
    var listener = function (payload) {
      self.emit(eventName, payload)
    }
    this._listening[eventName] = listener
    this._proxied.addListener(eventName, listener)
  },
  _exitEventProxy: function (eventName) {
    if (this._ownEvents[eventName]) return

    // Still listener for event given
    if (this.listenerCount(eventName) > 0) return

    var listener = this._listening[eventName]
    // Called without ever being added
    if (listener === undefined) return

    delete this._listening[eventName]
    this._proxied.removeListener(eventName, listener)
  },
  _exitAll: function () {
    for (var eventName of this._listening) {
      this._exitEventProxy(eventName)
    }
  },
  addListener: function (eventName, listener) {
    EventEmitter.prototype.addListener.call(this, eventName, listener)
    this._initEventProxy(eventName)
    return this
  },
  prependListener: function (eventName, listener) {
    EventEmitter.prototype.prependListener.call(this, eventName, listener)
    this._initEventProxy(eventName)
    return this
  },
  removeListener: function (eventName, listener) {
    EventEmitter.prototype.removeListener.call(this, eventName, listener)
    this._exitEventProxy(eventName)
    return this
  },
  removeAllListeners: function (eventName) {
    EventEmitter.prototype.removeAllListeners.call(this, eventName)
    if (arguments.length === 0) {
      this._exitAll()
    } else {
      this._exitEventProxy(eventName)
    }
    return this
  },
  once: function (eventName, listener) {
    var self = this
    var wrapper = function (payload) {
      listener(payload)
      self.removeListener(eventName, wrapper)
    }
    return this.addListener(eventName, wrapper)
  },
  prependOnceListener: function (eventName, listener) {
    var self = this
    var wrapper = function (payload) {
      listener(payload)
      self.removeListener(eventName, wrapper)
    }
    return this.prependListener(eventName, wrapper)
  },
  on: function (eventName, listener) {
    return this.addListener(eventName, listener)
  },
  off: function (eventName, listener) {
    return this.removeListener(eventName, listener)
  }
})


'use strict'
var EventProxy = require('./EventProxy.js')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

module.exports = PauseWrapper

function PauseWrapper (proxied) {
  if (!(this instanceof PauseWrapper)) {
    return new PauseWrapper(proxied)
  }
  EventProxy.call(this, proxied)
  this._ownEvents['pause'] = true
  this._ownEvents['paused'] = true
  this._ownEvents['resume'] = true

  this.pauseable = true
  this._paused = false
  this._closed = false
}

inherits(PauseWrapper, EventProxy)

Object.assign(PauseWrapper.prototype, {
  _onResume: function (handler) {
    if (this._closed) return
    if (this._paused || this.resuming) {
      return this._pauseStack.push(handler)
    }
    handler.call(this)
  },
  _onResumeCb: function (cb, handler) {
    var scope = this
    this._onResume(function () {
      handler.call(scope, function (err, data) {
        scope._onResume(function () {
          if (!cb) return
          cb.call(scope, err, data)
        })
      })
    })
  },
  emit: function (eventName, payload) {
    if (eventName === 'close' || eventName === 'destroy') {
      this._closed = true
      return EventEmitter.prototype.emit.call(this, eventName, payload)
    }
    if (this._closed) {
      return
    }
    if (eventName === 'pause' || eventName === 'resume' || eventName === 'paused') {
      return EventEmitter.prototype.emit.call(this, eventName, payload)
    }
    var scope = this
    this._onResume(function () { EventEmitter.prototype.emit.call(scope, eventName, payload) })
  },
  setPaused: function (paused) {
    if (paused === this._paused) return false
    if (this._resuming) {
      var scope = this
      this._pauseStack.push(function () { scope.setPaused(paused) })
      return false
    }
    this._paused = paused
    this.emit('paused', paused)
    if (paused) {
      this.emit('pause')
    } else {
      this.emit('resume')
    }
    if (paused) {
      if (this._pauseStack === undefined) {
        this._pauseStack = []
      }
    } else {
      while (this._pauseStack.length > 0 && !this._paused) {
        var handler = this._pauseStack.shift()
        handler()
      }
    }
    return true
  },
  pause: function () {
    return this.setPaused(true)
  },
  resume: function () {
    return this.setPaused(false)
  }
})

Object.defineProperties(PauseWrapper.prototype, {
  paused: {
    get: function () {
      return this._paused
    },
    set: function (paused) {
      this.setPaused(paused)
      return this._paused
    }
  }
})

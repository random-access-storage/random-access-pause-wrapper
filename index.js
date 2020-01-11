'use strict'
var PauseWrapper = require('./PauseWrapper.js')
var inherits = require('inherits')

module.exports = RASPauseWrapper

function RASPauseWrapper (ras) {
  if (!(this instanceof RASPauseWrapper)) {
    return new RASPauseWrapper(ras)
  }
  PauseWrapper.call(this, ras)

  this.opened = false
  this.closed = false
  this.destroyed = false
  this.readable = ras.readable
  this.writeable = ras.writeable
  this.deletable = ras.deletable
  this.preferReadonly = ras.preferReadonly
}

inherits(RASPauseWrapper, PauseWrapper)

function noop () { }

Object.assign(RASPauseWrapper.prototype, {
  open: function (cb) {
    var scope = this
    this._onResumeCb(cb, function (cbProxy) {
      this._proxied.open(function (err) {
        if (err) return cbProxy(err)
        scope.opened = true
        cbProxy()
      })
    })
  },
  read: function (offset, size, cb) {
    if (size === 0) {
      this._onResumeCb(cb, function (cbProxy) { cbProxy(null, Buffer.alloc(0)) })
    } else {
      this._onResumeCb(cb, function (cbProxy) { this._proxied.read(offset, size, cbProxy) })
    }
  },
  write: function (offset, buffer, cb) {
    this._onResumeCb(cb, function (cbProxy) { this._proxied.write(offset, buffer, cbProxy) })
  },
  del: function (offset, size, cb) {
    this._onResumeCb(cb, function (cbProxy) { this._proxied.del(offset, size, cbProxy) })
  },
  stat: function (cb) {
    this._onResumeCb(cb, function (cbProxy) { this._proxied.stat(cbProxy) })
  },
  close: function (cb) {
    this._closed = true
    var scope = this
    return this._proxied.close(function (err) {
      if (err) return cb(err)
      scope.closed = true
      cb()
    })
  },
  destroy: function (cb) {
    cb = cb || noop
    this._closed = true
    var scope = this
    return this._proxied.destroy(function (err) {
      if (err) return cb(err)
      scope.destroyed = true
      cb()
    })
  }
})

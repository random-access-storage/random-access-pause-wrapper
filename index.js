'use strict'
var PauseWrapper = require('./PauseWrapper.js')
var inherits = require('inherits')

module.exports = RASPauseWrapper

function RASPauseWrapper (ras) {
  if (!(this instanceof RASPauseWrapper)) {
    return new RASPauseWrapper(ras)
  }
  PauseWrapper.call(this, ras)

  this.closed = ras.closed
  this.readable = ras.readable
  this.writeable = ras.writeable
  this.deletable = ras.deletable
  this.preferReadonly = ras.preferReadonly
}

inherits(RASPauseWrapper, PauseWrapper)

Object.assign(RASPauseWrapper.prototype, {
  open: function (cb) {
    this._onResumeCb(cb, function (cb2) { this._proxied.open(cb2) })
  },
  read: function (offset, size, cb) {
    this._onResumeCb(cb, function (cb2) { this._proxied.read(offset, size, cb2) })
  },
  write: function (offset, buffer, cb) {
    this._onResumeCb(cb, function (cb2) { this._proxied.write(offset, buffer, cb2) })
  },
  del: function (offset, size, cb) {
    this._onResumeCb(cb, function (cb2) { this._proxied.del(offset, size, cb2) })
  },
  stat: function (cb) {
    this._onResumeCb(cb, function (cb2) { this._proxied.stat(cb2) })
  },
  close: function (cb) {
    this._closed = true
    return this._proxied.close(cb)
  },
  destroy: function (cb) {
    this._closed = true
    return this._proxied.destroy(cb)
  }
})

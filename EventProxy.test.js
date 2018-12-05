#!/usr/bin/env node
const tape = require('tape')
const events = require('events')
const EventProxy = require('./EventProxy.js')

tape('basic listening', function (t) {
  var target = new events.EventEmitter()
  var proxy = new EventProxy(target)
  t.equals(proxy.listenerCount('hello'), 0, 'By default no listener is added')
  target.addListener('hello', function () {})
  t.equals(proxy.listenerCount('hello'), 0, 'Just because a listener is added to the target doesnt mean there is a listener on the source')
  var addResult = proxy.addListener('holla', function (data) {
    t.equals(data, 'mundo', 'target event is passed to the proxy')
    t.end()
  })
  t.equals(addResult, proxy, 'Return type of ')
  t.equals(target.listenerCount('holla'), 1, 'There should be a listener on the target, after adding one to the proxy')
  target.emit('holla', 'mundo')
})

tape('once', function (t) {
  var target = new events.EventEmitter()
  var proxy = new EventProxy(target)
  var count = 0
  var addResult = proxy.once('hello', function (data) {
    t.equals(count, 0, 'event called once.')
    t.equals(data, 'world', 'data passed through')
    count += 1
  })
  t.equals(addResult, proxy, 'Result of once should be the proxy instance')
  t.equals(target.listenerCount('hello'), 1, 'Should have listener after once added')
  target.emit('hello', 'world')
  t.equals(target.listenerCount('hello'), 0, 'Should not have listener on target after once executed')
  t.equals(proxy.listenerCount('hello'), 0, 'Should not have listener on proxy after once executed')
  target.emit('hello', 'mundo')
  t.end()
})

// Node 4 compatibility
if (events.EventEmitter.prototype.prependOnceListener) {
  tape('prepend once', function (t) {
    var target = new events.EventEmitter()
    var proxy = new EventProxy(target)
    var count = 0
    target.addListener('hello', function () {
      count += 1
    })
    proxy.addListener('hello', function () {
      count += 2
    })
    var addResult = proxy.prependOnceListener('hello', function (data) {
      t.equals(count, 1, 'event called once, before the listeners on proxy, after the listeners on target')
      t.equals(data, 'world', 'data passed through')
      count += 1
    })
    t.equals(addResult, proxy, 'Result of prepend once is proxy instance')
    target.emit('hello', 'world')
    target.emit('hello', 'mundo')
    t.equals(count, 7)
    t.end()
  })
}

tape('remove all listeners', function (t) {
  var target = new events.EventEmitter()
  var proxy = new EventProxy(target)
  var count = 0
  target.addListener('hello', function () {
    count += 1
  })
  proxy.addListener('hello', function () {
    t.fail('Shouldnt be called because removed by removeAllListeners')
  })
  var removeResult = proxy.removeAllListeners('hello')
  t.equals(removeResult, proxy, 'Result of removeAllListeners is proxy instance')
  target.emit('hello', 'world')
  t.equals(count, 1, 'target listener is still called')
  t.end()
})

tape('own events', function (t) {
  var target = new events.EventEmitter()
  var proxy = new EventProxy(target)
  proxy._ownEvents['hello'] = true
  target.on('hello', function (data) {
    t.equals(data, 'world', 'target called with world')
  })
  var onResult = proxy.on('hello', function (data) {
    t.equals(data, 'mundo', 'proxy called with mundo, target not passed to proxy')
  })
  t.equals(onResult, proxy, 'result of on is proxy instance')
  target.emit('hello', 'world')
  proxy.emit('hello', 'mundo')
  t.end()
})

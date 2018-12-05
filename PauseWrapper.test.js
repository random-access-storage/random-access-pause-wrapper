#!/usr/bin/env node
const tape = require('tape')
const EventEmitter = require('events').EventEmitter
const PauseWrapper = require('./PauseWrapper.js')

tape('Pause order events', function (t) {
  const wrapper = new PauseWrapper()
  const stack = []

  wrapper.on('pause', function () {
    stack.push('pause')
  })

  wrapper.on('resume', function () {
    stack.push('resume')
  })

  wrapper.on('paused', function (paused) {
    stack.push('paused[' + paused + ']')
  })

  t.equals(wrapper.pauseable, true, 'The instance is marked as pausable')
  t.equals(wrapper.paused, false, 'Initially not paused')
  stack.push('pause()')
  t.equals(wrapper.pause(), true, 'Execution of pause is successful')
  t.equals(wrapper.paused, true, 'Calling pause makes it paused')
  stack.push('pause()')
  t.equals(wrapper.pause(), false, 'Pausing when paused doesnt work')
  t.equals(wrapper.paused, true, 'Calling once again doesnt change it')
  stack.push('resume()')
  t.equals(wrapper.resume(), true, 'Resume works when paused')
  t.equals(wrapper.paused, false, 'Calling resume unpauses it')
  stack.push('resume()')
  t.equals(wrapper.resume(), false, 'Multiple resumes have no effect')
  t.equals(wrapper.paused, false, 'Calling resume unpauses it')
  t.deepEqual(stack, [
    'pause()',
    'paused[true]',
    'pause',
    'pause()',
    'resume()',
    'paused[false]',
    'resume',
    'resume()'
  ], 'Proper event order')
  t.end()
})

tape('._onResume execution order', function (t) {
  const wrapper = new PauseWrapper()
  const stack = []

  stack.push('pause()')
  wrapper.pause()
  wrapper._onResume(function () {
    stack.push('resume[1]')
  })
  wrapper._onResume(function () {
    stack.push('resume[2]')
  })
  stack.push('resume()')
  wrapper.resume()
  wrapper._onResume(function () {
    stack.push('resume[3]')
  })
  stack.push('pause()')
  wrapper.pause()
  t.deepEqual(stack, [
    'pause()',
    'resume()',
    'resume[1]',
    'resume[2]',
    'resume[3]',
    'pause()'
  ])
  t.end()
})

tape('._onResumeCb', function (t) {
  const wrapper = new PauseWrapper()
  const stack = []
  function realCb (err, data) {
    t.equals(this, wrapper, 'wrapper should be set as scope')
    t.equals(err, 'hello', 'error properly propagated')
    t.equals(data, 'world', 'data properly propagated')
    t.deepEquals(stack, [
      '_onResumeCb()',
      'b()',
      'pause()',
      'resume()',
      'a()',
      'b-delay()'
    ])
    t.end()
  }
  stack.push('_onResumeCb()')
  wrapper._onResumeCb(realCb, function b (cb2) {
    stack.push('b()')
    t.notEquals(cb2, realCb, 'passed-in cb shouldnt match initial cb')
    t.equals(this, wrapper, 'wrapper should be set as scope')
    setImmediate(function () {
      stack.push('b-delay()')
      cb2('hello', 'world')
    })
  })
  stack.push('pause()')
  wrapper.pause()
  wrapper._onResume(function a () {
    stack.push('a()')
  })
  stack.push('resume()')
  wrapper.resume()
})

tape('events are not emitted on pause', function (t) {
  const wrapper = new PauseWrapper(new EventEmitter())
  const stack = []
  const somedata = {}
  wrapper.on('some-event', function (data) {
    stack.push('event[some-event]')
    t.equals(data, somedata)
  })
  stack.push('pause()')
  wrapper.pause()
  wrapper.emit('some-event', somedata)
  wrapper._onResume(function a () {
    stack.push('a()')
  })
  stack.push('resume()')
  wrapper.resume()
  t.deepEquals(stack, [
    'pause()',
    'resume()',
    'event[some-event]',
    'a()'
  ])
  t.end()
})

tape('Closing the wrapper stops all events', function (t) {
  const wrapper = new PauseWrapper(new EventEmitter())
  const stack = []

  t.equals(wrapper._closed, false, 'even though private "_closed" should be predictable')

  stackEvent('some-event')
  stackEvent('close')
  stackEvent('destroy')
  wrapper.emit('some-event')
  wrapper._onResumeCb(function cb () {
    t.fail('This is called even though it should be closed by now')
  }, function a (cb2) {
    stack.push('a()')
    setImmediate(cb2)
  })
  stack.push('._closed = true')
  wrapper._closed = true
  wrapper.emit('some-event')
  wrapper.emit('close')
  wrapper.emit('destroy')
  wrapper._onResume(function () {
    t.fail('This is called even though it was closed before')
  })

  // Give it some time, to make sure that the callback has run
  // properly.
  setTimeout(function () {
    t.deepEqual(stack, [
      'event[some-event]',
      'a()',
      '._closed = true',
      'event[close]',
      'event[destroy]'
    ])
    t.end()
  }, 10) // 10ms should be enough.

  function stackEvent (eventName) {
    wrapper.on(eventName, function () { stack.push('event[' + eventName + ']') })
  }
})

tape('pause on resume', function (t) {
  const wrapper = new PauseWrapper(new EventEmitter())
  const stack = []

  stackEvent('pause')
  stackEvent('resume')

  stack.push('pause()')
  wrapper.pause()
  wrapper._onResume(function firstResume () {
    stack.push('firstResume()')
    stack.push('pause()')
    wrapper.pause()
    wrapper._onResume(function thirdResume () {
      stack.push('thirdResume()')
      t.deepEquals(stack, [
        'pause()',
        'event[pause]',
        'resume()',
        'event[resume]',
        'firstResume()',
        'pause()',
        'event[pause]',
        'timeout()',
        'resume()',
        'event[resume]',
        'secondResume()',
        'thirdResume()'
      ])
      t.end()
    })
    setTimeout(function timeout () {
      stack.push('timeout()')
      stack.push('resume()')
      wrapper.resume()
    })
  })
  wrapper._onResume(function secondResume () {
    stack.push('secondResume()')
  })
  stack.push('resume()')
  wrapper.resume()

  function stackEvent (eventName) {
    wrapper.on(eventName, function () { stack.push('event[' + eventName + ']') })
  }
})

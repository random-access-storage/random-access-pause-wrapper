#!/usr/bin/env node
const tape = require('tape')
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

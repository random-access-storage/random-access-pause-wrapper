#!/usr/bin/env node
const tape = require('tape')
const randomTest = require('random-access-test')
const ram = require('random-access-memory')
const randomFile = require('random-access-file')
const pauseWrap = require('.')

var opts = {
  writable: true,
  reopen: true,
  del: true,
  truncate: false,
  size: true,
  content: false,
  dir: '/tmp/random-pause-test'
}

randomTest(function (filename, opts2, callback) {
  var storage = randomFile(opts.dir + '/' + filename, opts2)
  callback(pauseWrap(storage))
}, opts)

function pauseRam (buffer) {
  return pauseWrap(ram(buffer))
}

tape('write and read', function (t) {
  const file = pauseRam()

  file.write(0, Buffer.from('hello'), function (err) {
    t.error(err, 'no error')
    file.read(0, 5, function (err, buf) {
      t.error(err, 'no error')
      t.same(buf, Buffer.from('hello'))
      t.end()
    })
  })
})

tape('read empty', function (t) {
  const file = pauseRam()

  file.read(0, 0, function (err, buf) {
    t.error(err, 'no error')
    t.same(buf, Buffer.alloc(0), 'empty buffer')
    t.end()
  })
})

tape('read range > file', function (t) {
  const file = pauseRam()

  file.read(0, 5, function (err, buf) {
    t.ok(err, 'not satisfiable')
    t.end()
  })
})

tape('random access write and read', function (t) {
  const file = pauseRam()

  file.write(10, Buffer.from('hi'), function (err) {
    t.error(err, 'no error')
    file.write(0, Buffer.from('hello'), function (err) {
      t.error(err, 'no error')
      file.read(10, 2, function (err, buf) {
        t.error(err, 'no error')
        t.same(buf, Buffer.from('hi'))
        file.read(0, 5, function (err, buf) {
          t.error(err, 'no error')
          t.same(buf, Buffer.from('hello'))
          file.read(5, 5, function (err, buf) {
            t.error(err, 'no error')
            t.same(buf, Buffer.from([0, 0, 0, 0, 0]))
            t.end()
          })
        })
      })
    })
  })
})

tape('buffer constructor', function (t) {
  const file = pauseRam(Buffer.from('contents'))

  file.read(0, 7, function (err, buf) {
    t.error(err)
    t.deepEqual(buf, Buffer.from('content'))
    t.end()
  })
})

tape('pause after read', function (t) {
  const mem = ram(Buffer.from('contents'))
  const file = pauseWrap(mem)
  const stack = []
  const _read = mem.read
  mem.read = function (offset, size, cb) {
    stack.push('read() - internal')
    _read.call(mem, offset, size, cb)
  }

  t.equals(file.pauseable, true)
  t.equals(file.paused, false)
  stack.push('.paused = true')
  stack.push('read()#1')
  file.read(0, 7, function readCb1 (err, buf) {
    stack.push('readCb1()')
    t.error(err)
    t.deepEqual(buf, Buffer.from('content'))
  })
  file.paused = true
  stack.push('read()#2')
  file.read(0, 7, function readCb (err, buf) {
    stack.push('readCb2()')
    t.error(err)
    t.deepEqual(buf, Buffer.from('content'))
    t.deepEqual(stack, [
      '.paused = true',
      'read()#1',
      'read() - internal',
      'read()#2',
      'setTimeout()',
      '.paused = false',
      'read() - internal',
      'readCb1()',
      'readCb2()'
    ])
    t.end()
  })
  stack.push('setTimeout()')
  setTimeout(function () {
    stack.push('.paused = false')
    file.paused = false
  }, 10)
})

tape('open/close/destroy', function (t) {
  const mem = ram()
  const file = pauseWrap(mem)
  testState(false, false, false)
  file.open(function (err) {
    t.error(err, 'open successful')
    testState(true, false, false)
    file.close(function (err) {
      t.error(err, 'close successful')
      testState(true, true, false)
      file.destroy(function (err) {
        t.error(err, 'destroy successful')
        testState(true, true, true)
        t.end()
      })
    })
  })
  testState(false, false, false)
  function testState (opened, closed, destroyed) {
    t.equals(file.opened, opened, 'file.opened == ' + opened)
    t.equals(file.closed, closed, 'file.closed == ' + closed)
    t.equals(file.destroyed, destroyed, 'file.destroyed == ' + destroyed)
    t.equals(mem.opened, opened, 'mem.opened == ' + opened)
    t.equals(mem.closed, closed, 'mem.closed == ' + closed)
    t.equals(mem.destroyed, destroyed, 'mem.destroyed == ' + destroyed)
  }
})

tape('open/close while pause', function (t) {
  const ram = pauseRam()
  const stack = []
  stack.push('pause()')
  ram.pause()
  stack.push('open()')
  ram.open(function openCb () {
    stack.push('openCb()')
    stack.push('pause()')
    ram.pause()
    stack.push('close()')
    ram.close(function () {
      t.equals(ram.closed, true, 'now it is closed')
      t.equals(ram.paused, true, 'close works while pause')
      t.deepEqual(stack, [
        'pause()',
        'open()',
        'resume()',
        'openCb()',
        'pause()',
        'close()'
      ])
      t.end()
    })
  })
  setTimeout(function () {
    t.equals(ram.opened, false)
    stack.push('resume()')
    ram.resume()
  }, 10)
})

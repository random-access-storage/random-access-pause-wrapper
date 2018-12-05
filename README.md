# random-access-pause-wrapper

Wraps any [random-access-storage](https://github.com/random-access-storage/random-access-storage) instance and adds a `pause()` and `resume()` method
that 

```
npm install random-access-pause-wrapper
```

[![build status](http://img.shields.io/travis/martinheidegger/random-access-pause-wrapper.svg?style=flat)](http://travis-ci.org/martinheidegger/random-access-pause-wrapper)

## Usage

``` js
var ram = require('random-access-memory')
var pause = require('random-access-pause-wrapper')
var file = pause(ram())

console.log(file.paused) // false

file.write(
  0,
  Buffer.from('hello'),
  function () { // This callback will be triggered on-resume
    file.write(5, Buffer.from(' world'), function () {
      file.read(0, 11, console.log) // returns Buffer(hello world)
    })
  }
)

file.pause() // file.paused = true is an alternative API
console.log(file.paused) // true

file.on('pause', function () { console.log('pause called') })
file.on('resume', function () { console.log('resume called') })
file.on('paused', function (paused) { console.log('paused: ' + paused) })

file.resume() // file.paused = false works too.
```

## License

MIT

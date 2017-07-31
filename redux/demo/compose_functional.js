function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

function f0(n) {
    console.log('f0');
    return n + 1;
}

function f1(n) {
    console.log('f1');
    return n * 2;
}

function f2(n) {
    console.log('f2');
    return n * n;
}

console.log(compose(f0, f1, f2)(1));

const ff0 = next => n => { console.log('ff0'); n = next(n); return n + 1; };
const ff1 = next => n => { console.log('ff1'); n = next(n); return n * 2; };
const ff2 = next => n => { console.log('ff2'); n = next(n); return n * n; };

const next = n => n;

const f = compose(ff0, ff1, ff2);

console.log(f(next)(1));
export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

/* compose函数作用为 f(g(h(...args)))函数变为 composed = compose(f,g,h), composed(...args)
** compose(f,g,h)返回值实现了函数 args => f(g(h(...args))) 的功能
** 两种方法作用相同，但是后面的形式上更简单 */

/*  这里有个小问题，就是形如f(g(h()))，谁先调用的问题，简化为两个函数f(g())，是f先调用，还是g先调用？
**  毫无疑问，肯定是先调用g()，得到结果后再传入f进行调用， res = g() -> f(res)
**  compose的写法和上述调用方式是吻合的，即从后往前调用函数
**  但是，当f(composed)返回值是个函数时，情况就不同了，从后往前调用函数时，将调用的结果(还是为函数)传入前面一个函数
**  最终返回结果是个函数，当调用这个函数时，会先调用第一个元素的函数体，在第一个元素函数体中调用传入的参数(即从后往
**  前传的那个结果，值为函数)，这会调用第二个元素的函数体，再第二个元素函数体中调用后面传过来的参数，会调用第三个函
**  数的函数体... 一直如此下去
*/

/*  当funcs为普通函数数组时，元素形如 a => a, a => a*a时，funcs = [f0, f1, f2, f3 ... ]
**  调用方式为从后往前调用，即f3 -> f2 -> f1 -> f0
**  const f0 = n => { console.log('f0'); return n + 1; }
**  const f1 = n => { console.log('f1'); return n * 2; }
**  const f2 = n => { console.log('f2'); return n * n; }
**  const f = compose(f0, f1, f2);
**  f(1); // 3
**  f2  f1  f0
** 
**  当funcs为高阶函数时，元素形如 next => action => next(action)，调用compose(...funcs)时，是从后往前调用的
**  但是由于f(composed)返回值为函数，形如 action => next(action)
**  调用compose，并传入初始next函数，返回值仍为函数，fn = compose(...funcs)(next)
**  调用fn(action)时，会按照传入的funcs的顺序从前往后调用对应的函数体，再根据next的值进行连环调用(类似于递归),再逐层返回
**  实际上和递归一样，当console.log位于next前面时，是 f0 f1 f2，当位于next后面时，就为 f2 f1 f0
**  但执行函数入口处时，确实是从前往后的，这和非高阶函数的执行顺序是相反的
**  const f0 = next => n => { console.log('f0'); n = next(n); return n + 1; };
**  const f1 = next => n => { console.log('f1'); n = next(n); return n * 2; };
**  const f2 = next => n => { console.log('f2'); n = next(n); return n * n; };
**  const f = compose(f0, f1, f2);
**  const next = n => n;
**  f(next)(1); //3
**  f0  f1  f2
**
**  示例代码参见 compose_functional.js
*/

/*
**  高阶函数中要注意，如果中间件想在原生dispatch调用前执行，就要写在next(action)之前，若想在原生dispatch调用后执行，
**  比如logger打印改变后的state，则要写在next(action)之后，这样，递归调用时，dipatch调用返回后才会执行当前代码
**  const f0 = next => action => { console.log('f0'); next(action); };
**  const f1 = next => action => { console.log('f1'); next(action); };
**  const f2 = next => action => { console.log('f2'); next(action); };
**  const store = createStore(reducer, applyMiddle(f0, f1, f2));
**  store.dispatch(action);  // f0 f1 f2
**  
**  const f0 = next => action => { next(action); console.log('f0'); };
**  const f1 = next => action => { next(action); console.log('f1'); };
**  const f2 = next => action => { next(action); console.log('f2'); };
**  const store = createStore(reducer, applyMiddle(f0, f1, f2));
**  store.dispatch(action);  // f2 f1 f0
**
**  const f0 = next => action => { console.log('f0+'); next(action); console.log('f0-'); };
**  const f1 = next => action => { console.log('f1+'); next(action); console.log('f1-'); };
**  const f2 = next => action => { console.log('f2+'); next(action); console.log('f2-'); };
**  const store = createStore(reducer, applyMiddle(f0, f1, f2));
**  store.dispatch(action);  // f0+ f1+ f2+ f2- f1- f0-
**  以next为分界，和递归执行顺序相同，next钱代码递归前执行，next后代码递归调用后执行
**  即next前的代码为从左往右执行，next后代码为从右往左执行
**  f0  log('f0+')   ->   next(进入f1)                                                                               log('f0-')
**  f1                log('f1+')   ->   next(进入f2)                                                log('f1-')     ->返回上层函数f0
**  f2                              log('f2+')   ->   next(进入dispatch)        log('f2-')    ->    返回上层函数f1
**                                                    dispatch(action)    ->    返回上层函数f2
*/


//一种更容易理解的实现方式
function anotherCompose(..funcs) {
    if (funcs.length === 0)
        return arg => arg;

    if (funcs.length === 1)
        return funcs[0];

    const last = funcs[funcs.length - 1]; // last function
    const rest = funcs.slice(0, -1); // all functions except the last one
    /* reduceRight为数组的reduce函数将数组元素从右到左执行，默认reduce为从左到右
    * 因为只有第一个（从右到左）函数才会有多个参数，调用第一个函数后，将返回值当做第二个函数的参数传入
    * 调用第二个函数后，将第二个函数的返回值当做第三个函数的参数传入并调用第三个函数，一直如此，直到最后一个函数
    * 而下面的reduceRight正好实现了上述调用方式
    * reduceRight调用的函数(composed, f) => f(composed)，传入composed为上一个该函数返回值，也即f(composed)的值
    * f为数组中的当前元素，初始值为调用last函数的返回值
    */
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
}

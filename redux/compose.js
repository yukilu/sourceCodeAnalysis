/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

// compose函数作用为 f(g(h(...args)))函数变为 composed = compose(f,g,h), composed(...args)
// compose(f,g,h)返回值实现了函数 args => f(g(h(...args))) 的功能
// 两种方法作用相同，但是后面的形式上更简单
//一种更容易理解的实现方式
function anotherCompose(..funcs) {
    if (funcs.length === 0)
        return arg => arg;

    if (funcs.length === 1)
        return funcs[0];

    const last = funcs[funcs.length - 1]; // last function
    const rest = funcs.slice(0, -1); //all functions except the last one
    /* reduceRight为数组的reduce函数将数组元素从右到左执行，默认reduce为从左到右
    * 因为只有第一个（从右到左）函数才会有多个参数，调用第一个函数后，将返回值当做第二个函数的参数传入
    * 调用第二个函数后，将第二个函数的返回值当做第三个函数的参数传入并调用第三个函数，一直如此，直到最后一个函数
    * 而下面的reduceRight正好实现了上述调用方式
    * reduceRight调用的函数(composed, f) => f(composed)，传入composed为上一个该函数返回值，也即f(composed)的值
    * f为数组中的当前元素，初始值为调用last函数的返回值*/
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
}

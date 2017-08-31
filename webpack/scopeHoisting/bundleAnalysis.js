/* 作用域提升，只能用es6的写法才有用
 * 最外层结构和原来相同，只是里面传递的数组，不再是将各个模块用函数包起来，而是都把各个模块用一个不重名的变量命名统一放到一个函数下，
 * 这样就减少了函数的开销，提高了运行速度
 * 
 * webpack本身就支持import，所以不需要用babel编译，如果经过babel编译了之后变成es5的写法，再通过webpack打包，会造成webpack用原来的方式打包
 */

(function(modules) { /*webpackBootstrap*/})([
    /* 0 */
    (function(module, __webpack_exports__, __webpack_require__) {
        "use strict";
        
        Object.defineProperty(__webpack_exports__, "__esModule", { value: true });

        // CONCATENATED MODULE: ./react/a.js
        const a = 0;

        /* harmony default export */ var react_a = (a);
        // CONCATENATED MODULE: ./react/b.js
        const b = 1;

        /* harmony default export */ var react_b = (b);
        // CONCATENATED MODULE: ./react/entry.js

        console.log(react_a + react_b);
    })
]);
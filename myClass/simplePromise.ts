// 简化版Promise，只实现了最核心的then函数，清楚展现了Promise的实现逻辑，其实就是回调函数

// executor函数类型，就是new Promise(executor)时用的
interface Executor<T> {
    (resolve: (value: T) => void, reject ?: (error: any) => void): void
}

// 成功回调函数类型，(v: T) => void，简单起见，无返回值
interface Fulfilled<T> {
    (value: T): void
}

// 失败回调函数类型，(e: any) => void，简单起见，无返回值
interface Rejected {
    (error: any): void
}

// 泛型类，其中的T为resolve中传入的值的类型，error默认为any，所以不设定类型
class MyPromise<T> {
    // 缓存值
    private cachedValue: T;
    private cachedError: any;
    // Promise状态，初始为PENDING，决议后为FULFILLED或REJECTED
    private state: string = 'PENDING';
    // 成功及失败回调函数的缓存函数
    private cachedFulfilled: Fulfilled<T>;
    private cachedRejected: Rejected;

    constructor(executor :Executor<T>) {
        const self: MyPromise<T> = this;
        executor(resolve, reject);

        // 自定义的resolve及reject函数，主要作用是改变Promise状态，以及缓存值
        // 同时判断是否存在缓存函数，存在就调用
        function resolve(value: T) {
            self.state = 'FULFILLED';
            self.cachedValue = value;
            self.cachedFulfilled && self.cachedFulfilled(value);
        }

        function reject(error: any) {
            self.state = 'REJECTED';
            self.cachedError = error;
            self.cachedRejected && self.cachedRejected(error);
        }
    }

    // 最简单的then函数，即返回值不是个Promise
    simpleThen(this: MyPromise<T>, fulfilled: Fulfilled<T>, rejected: Rejected) {
        // 进行到then时，Promise已决议，就直接调用对应的成功/失败回调函数
        if (this.state === 'FULFILLED')
            fulfilled(this.cachedValue);
        else if (this.state === 'REJECTED')
            rejected(this.cachedError);
        // 进行到then时，状态为未决议，则将成功/失败回调函数缓存到当前Promise实例的对应缓存函数上
        // 然后当调用决议函数的时候会一起调用这些缓存的函数
        else {
            this.cachedFulfilled = fulfilled;
            this.cachedRejected = rejected;
        }
    }

    // 返回值为Promise，但由于fulfilled/rejected回调函数返回值为void，所以返回的Promise值中
    // resovle传入的值也是void，因为这里是将fulfilled/rejected回调函数简化处理了，即其返回值
    // 为void，若其返回值存在或者为Promise，那then返回的Promise中resolve或reject也会接收到对应
    // 的值，这样就和真正的Promise一样了
    then(this: MyPromise<T>, fulfilled: Fulfilled<T>, rejected: Rejected): MyPromise<void> {
        // 进行到then时，Promise已决议，返回一个直接将对应缓存值传入后已决议的Promise
        if (this.state === 'FULFILLED')
            return new MyPromise<void>(resolve => {
                resolve(fulfilled(this.cachedValue));
            });
        if (this.state === 'REJECTED')
            return new MyPromise<void>(resolve => {
                resolve(rejected(this.cachedError));
            });
        
        // 进行到then时，Promise未决议，这时就和上面一样，也需要返回一个Promise，所以在executor
        // 函数中，将fullfiled/rejected回调函数缓存到Promise上的缓存函数中，同时，在缓存函数中
        // 决议then返回的Promise，这样就当当前Promise决议时，resolve调用缓存函数，就会调用fulfilled
        // 回调函数，同时调用then返回的Promise中的resolve，造成其决议，这样最终就会形成当前Promise
        // 决议时，then返回的Promise也决议，形成了回调链
        return new MyPromise<void>((resolve, reject) => {
            this.cachedFulfilled = (value: T) => {
                resolve(fulfilled(this.cachedValue));
            };
            this.cachedRejected = (error: any) => {
                reject(rejected(this.cachedError));
            }
        });
    }
}
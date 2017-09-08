const ob = Observable.create(function (observer) {
    observer.next(0);
    observer.complete();
});

const observer = { next: v => console.log(v), complete: () => console.log('complete') };

/* 上面的监听完成后不会影响下面的，因为completed属性是挂载在observer传入之后创立的Observer的实例上的，即subscribe时候，除了this.main
 * 函数相互独立调用之外，重新处理observer，observer = new Observer(observer)，每次subscribe，observer都会重新赋值成一个新的Observer实例
 * subscribe之间也是互不影响的，不会因为之前监听的observable.complete了，后续监听observable时都是完成状态，因为完成状态挂载在Observer
 * 实例上，而每次subscribe时，都会在内部新创建一个Observer实例，相互独立
 */
ob.subscribe(observer);  // 0 complete
ob.subscribe(observer);  // 0 complete
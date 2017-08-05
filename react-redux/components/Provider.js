import { Component, Children } from 'react'
import PropTypes from 'prop-types'
import { storeShape, subscriptionShape } from '../utils/PropTypes'

// 简化了一下代码，将错误处理去除了
export function createProvider(storeKey = 'store', subKey) {
    const subscriptionKey = subKey || `${storeKey}Subscription`

          /* const Connect = connect(...)(WrappedComponent)
          ** <Provider store={store} />
          **     <Connect />
          ** </Provider>
          ** Provider的作用主要为两点
          ** 1. 将store挂载到context上，传给所有子组件使用
          ** 2. render的值为Provider的唯一子元素，即包装过原始组件后的Connect组件
          ** 即渲染Provider时会渲染唯一子元素Connect组件，进而渲染被包裹的原始组件WrappedComponent*/
    class Provider extends Component {
        /* https://facebook.github.io/react/docs/context.html
        ** 设置context，并将其传至子组件，实例化子组件时调用的constructor(props, context)会将context层层传下去
        ** this.store = props.sotre, constructor时将作为属性传入的store挂载到this上
        ** context =  { store: this.store }，然后再挂载到context上
        **  */
        getChildContext() {
          return { [storeKey]: this[storeKey], [subscriptionKey]: null }
        }

        constructor(props, context) {
          super(props, context)
          this[storeKey] = props.store;
        }

        render() {
          /* Object React.Children.only(Object children)，返回children中仅有的子级，否则抛出异常
          ** Children.only是指其接受的参数只能是一个对象，不能多个，否则报错，即this.props.children只能为单个对象   
          ** 本身Provider中this.props.children也只能是一个Connect元素
          ** 渲染Provider时，即渲染Provider的Connect子组件，进而渲染原始组件WrappedComponent*/
          return Children.only(this.props.children)
        }
    }

    Provider.propTypes = {
        store: storeShape.isRequired,
        children: PropTypes.element.isRequired,
    }
    Provider.childContextTypes = {
        [storeKey]: storeShape.isRequired,
        [subscriptionKey]: subscriptionShape,
    }
    Provider.displayName = 'Provider'

    return Provider
}

export default createProvider()

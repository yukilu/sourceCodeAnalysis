import { render } from 'react-dom';
import { Provider } from 'react-redux';

import Counter from './components/Counter';
import { store, anotherStore } from './store/counterStore';

function ProviderWrap(props) {
    return (
        <div>
            <Provider store={store} >
                <Counter />
            </Provider>
            <Provider store={anotherStore} >
                <Counter />
            </Provider>
        </div>
    );
}

render(
    <ProviderWrap />,
    document.getElementById('root')
);
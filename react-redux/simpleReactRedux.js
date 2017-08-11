import { Component, Children } from 'react';
import PropTypes from 'prop-types';

export class Provider extends Component {
    static childContextTypes = { store: PropTypes.object };

    getChildContext() {
        return { store: this.props.store };
    }

    render() {
        return Children.only(this.props.children);
    }
}

export class Connect extends Component {
    static contextTypes = { store: PropTypes.object };

    constructor(props, context) {
        this.store = this.context.store;
    }
}
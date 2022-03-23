import React from 'react';
import ReactDom from 'react-dom';
import {App} from './app';
import 'antd/dist/antd.variable.min.css';

ReactDom.render(
    <App />,
    document.querySelector('#root')
)

import React from 'react';
import ReactDom from 'react-dom';
import 'antd/dist/antd.min.css';
import {App} from './app';

ReactDom.render(
    <App />,
    document.querySelector('#root')
)

import React from 'react';
import {isEmpty} from 'lodash-es';
import {Button} from 'antd';
// import 'antd/dist/antd.css';
import ReactDom from 'react-dom';
import {App} from './app';
import "antd/es/button/style/index.css";
import "antd/es/date-picker/style/css.js"

console.log(isEmpty({}));

ReactDom.render(
    <>
        <Button type="primary">
            Primary Button
        </Button>
        <App />
    </>,
    document.querySelector('#root')
)

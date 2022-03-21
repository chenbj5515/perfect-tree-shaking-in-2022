import React from 'react';
import {Button, DatePicker, Switch} from 'antd';
import darkVars from './dark.json';
import themeVars from './theme.json';
import lightVars from './light.json';
import 'antd/es/button/style';
import 'antd/es/date-picker/style';
import 'antd/es/switch/style';

function onChange(checked: boolean) {
    if (checked) {
        // @ts-ignore
        // window.less.modifyVars({
        //     '@primary-color': 'black'
        // });
        // @ts-ignore
        window.less.modifyVars(themeVars);
        return;
    }
    // @ts-ignore
    // window.less.modifyVars({
    //     '@primary-color': '#002fa7'
    // })

    // @ts-ignore
    window.less.modifyVars(darkVars);
    
}

export const App = () => (
    <>
        <Switch defaultChecked onChange={onChange} />
        <Button type="primary">
            My Button
        </Button>
        <DatePicker />
    </>
)
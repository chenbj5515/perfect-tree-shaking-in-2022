import React from 'react';
import {Button, DatePicker, Switch} from 'antd';
import darkVars from './dark.json';
import themeVars from './theme.json';

function onChange(checked: boolean) {
    if (checked) {
        // @ts-ignore
        window.less.modifyVars(themeVars);
        return;
    }
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
import React from 'react';
import {Button, DatePicker, Switch} from 'antd';
import { ConfigProvider } from 'antd';

function onChange(checked: boolean) {
    if (checked) {
        ConfigProvider.config({
            theme: {
                primaryColor: 'black',
            },
        });
    }
    else {
        ConfigProvider.config({
            theme: {
                primaryColor: '#25b864',
            },
        })
    }
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
import Menu, {func0} from './child';

// console.log(func0(), 'foo===');

function foo(info) {
    return info + '';
}

foo('be retained');

/*#__PURE__*/foo('be removed');

// func0();
// const menu = new Menu();
const a = 1;

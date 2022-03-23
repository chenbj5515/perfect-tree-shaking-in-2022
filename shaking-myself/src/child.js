export const func0 = () => 0;

export const func1 = () => {
    // console.log(1);
    return 1;
}

export default class Menu {
    display;

    constructor() {
        this.display = 'none';
    }

    show() {
        this.display = 'block';
    }
}

func1();
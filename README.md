# perfect-tree-shaking-in-2022

## why
关于tree-shaking，中文网络上搜到的文章大多是过时的、不全面的。因此我希望用这篇文章说明下在2022这个timing，该如何做到完美的tree-shaking。

## what
周所周知，tree-shaking是要摇掉dead code。<br>
什么是dead code呢？<br>
dead code直白来说就是没有任何作用的代码。比如变量导出了但未被引用，变量定义了但未被使用的，那么变量的定义代码就是dead code。<br>
dead code的来源有两个，一是开发者在项目中写的代码，一个是来源于npm包的项目依赖的代码。
### 如何shaking掉开发者自己的dead code？
你只需要配置这三项，就能让自己项目中的代码较完美地tree-shaking
```
optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
        new TerserWebpackPlugin()
    ]
}
```
```
// index.ts
import {func0, func1} from './child';

console.log(func0(), 'foo===');

// func1();

const a = 1;

// child.ts
export const func0 = () => 0;

export const func1 = () => {
    console.log(1);
    
    return 1;
}

func1();
```
我们分析一下dead code，首先index中的a变量声明代码就是，应该完全被shake掉才对。<br>
然后是func1函数，虽然在child中被定义了，也被index引用了，但并没有被实际调用。但我们看到在child中它是先声明后调用了一次，并且这个函数是有副作用（log 1）的。<br>
所以它算dead code吗？我们先假设它是一个纯函数，也就是没有log 1，那很显然，这个调用对整体不产生任何作用，也没有被引用，所以是dead code。但既然有副作用，那就值得玩味了，我们看看这样的配置下处理结果：
```
"./src/child.ts": (e, s, o) => {
    o.d(s, { func0: () => c });
    const c = () => 0;
    console.log(1);
},
"./src/index.ts": (e, s, o) => {
    var c = o("./src/child.ts");
    console.log((0, c.func0)(), "foo===");
},
```
结果看起来非常完美，副作用log 1被提取出来并执行了，而包含副作用的函数的定义代码由于没有被其他模块调用所以完全被shake掉了。竟然能提取副作用，这个shaking效果是超出预期的。<br>
再继续探究下这个context下的shaking行为，发现被外部引用并调用的话就一定不会被shaking掉了，即使是纯函数，你可以自己在/shaking-myself/src目录下自行修改实验，之后即可pnpm run start，在开发者工具的Sources Tab中拿到转译后的main.js代码以查阅shaking结果。

### shaking依赖中的dead code
虽然可以通过以上配置较完美地shaking开发者自己代码，但shaking自己其实作用通常不大，一方面大多数项目开发者自己代码占比很小。另一方面，如果开发流程足够规范，开发者自己项目的代码基本不会有dead code。<br>
所以tree shaking的重点在于shake依赖的代码，也就是按需引入依赖。<br>

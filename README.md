# perfect-tree-shaking-in-2022

## why
关于tree-shaking，中文网络上搜到的文章大多是过时的、不全面的。因此我希望用这篇文章说明下在2022这个timing，该如何做到完美的tree-shaking。

## what
周所周知，tree-shaking是要摇掉dead code。<br>
什么是dead code呢？<br>
dead code直白来说就是没有任何作用的代码。比如变量导出了但未被引用，变量定义了但未被使用的，那么变量的定义代码就是dead code。<br>
dead code的来源有两个，一是开发者在项目中写的代码，一个是来源于npm包的项目依赖的代码。
### 如何shaking掉开发者自己的dead code？
在webpack下，你只需要配置这三项，就能让自己项目中的代码较完美地tree-shaking
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
我们以两个经典的库的引用来说明：
#### lodash
lodash这个包如果直接这样引入：
import {isEmpty} from 'lodash';
会直接访问node_modules/lodash.js这个总包，这个总包中包含了lodash所有工具函数，大小有500+KB，这显然是不可接受的。<br>
而用import isEmpty from 'lodash/isEmpty';这样引入的话，是可以只引入这个函数自身以及它的所有依赖。<br>
但这样的引入方式又不太便捷，如果用多个的话要写多行引入，所以最好的方式是：
import {isEmpty} from 'lodash-es';<br>
以上这些，大家都知道。但这个问题就不是所有人都清楚的了：为什么lodash-es可以按需，而lodash则不可以呢？<br>
我们现在已知的事实是，lodash是用cjs格式写的，引入的时候会引入lodash.js这个总包。并且工具解析cjs代码时，会把所有的方法都挂载到一个对象上，最终我们o.isEmpty这样来使用其中的方法。<br>
而lodash-es中所有代码都是esm格式，打包的时候仅读取了isEmpty一个文件放到vendors.js中，而main.js中也正好引用的就是这个一个方法。<br>
那么为什么cjs不能像esm格式这样只引入一个文件呢？<br>
这个问题我们就要看下cjs下lodash的源码了，我们进入lodash/lodash.js中一看就知道了，这家伙并没有引入任何其他模块，而是已经把所有其他模块代码都打包到lodash.js这一个文件中了。这样解析'lodash'的时候，自然会用lodash.js这一整坨代码，而不是单独引入isEmpty一个文件。<br>
而lodash-es则不一样了，lodash.js文件是这样的：
```
//...
export { default as isDate } from './isDate.js';
export { default as isElement } from './isElement.js';
export { default as isEmpty } from './isEmpty.js';
//...
```
这样就知道应该去哪个文件找到引入的isEmpty代码，至于其他的文件显然根本不需要管。<br>
那么我们再想一下，如果lodash/lodash.js中是const {isEmpty} = require('./isEmpty')，通过exports.isEmpty = isEmpty这样导出，那项目中import {isEmpty} from 'lodash';可以按需吗？<br>
实际上这样也是不行的，因为cjs就是整体导出模块对象，对象上是包含所有方法的。所以要按需加载的话就必须用esm格式。
#### antd
到了UI库的treeshaking这里就不只是js的按需，还包括css的按需。<br>
先说js部分，antd和lodash不同，默认就带esm的包。antd通过在自己的package.json中设置"module": "es/index.js"和注明sideEffects属性的方式，让import {Button} from 'button'的方式可以按需引入。<br>
但是，问题并没有结束，如何按需引入css也是一个问题。<br>
如果直接按照import 'antd/dist/antd.min.css';的话，这个css的体积有500多K，还是比较大的。<br>
当然如果只用一个组件的话，import "antd/es/button/style/index.css";就能解决问题。<br>
当然，我们还可能用其他样式，比如antd的默认样式，那就需要再引一个"antd/es/style/default.css"。<br>
但事情并没有这么简单，如果只是静态的样式，这样就可以满足了，但是2022年了，暗色主题已经被广泛应用了。<br>我们必须思考，如果需要一键切换明暗主题的话，还能这样用一个组件引一个吗？<br>
首先，我们需要明确下antd下明暗色切换的通用实践和实现原理。<br>
先澄清下，亮暗切换和动态主题并不是一回事。动态主题在antd官网有一个单独的tab来介绍，它可以用来给antd换一套主题色甚至动态改变主题色。这个功能是相当灵活的，你可以把原本蓝色的主题修改为任意颜色的主题。这意味着你需要指定一套新的主题。而暗色模式相当于是另一套主题，无需你或者你的设计伙伴设计颜色（除非你对antd默认的暗色模式不满意）。<br>
其实，亮暗切换就是antd默认主题<->antd暗色主题的过程。我们需要探讨下实现原理以及这种情况下是否还可以按需引入css<br>
我们直接说答案，能。是的，使用antd-theme-webpack-plugin插件，你完全可以既按需引入又实现动态主题。<br>
但相关讨论和本文相关性不高，所以如想看，可以移步这里：https://chenbj5515.notion.site/Antd-28ec0ce2076f41809c5481ca1bade2cf<br>
当然，严格来说按需引入css其实不算tree-shaking。一开始就没引入，何谈的tree-shaking呢？<br>
实际上，更常用的方案是，全量引入css后tree-shaking掉没有被js和html中用到的样式。<br>
2022这个时间节点，实现这个功能最主流的方式是用postcss+postcss的插件postcss-purgecss。<br>
1. 首先确保用了postcss，在webpack项目中的话，只要对css文件配置了postcss-loader的话就是用了
2. 在postcss.config.js中plugins数组中追加postcss-purgecss插件即可：
```
const purgecss = require('@fullhuman/postcss-purgecss');
const glob = require("glob-all");

module.exports = {
    plugins: [
      purgecss({
        content: [
          './**/*.html',
          ...glob.sync(`./src/**/*.js`, {nodir: true}),
          ...glob.sync(`./node_modules/antd/**/*.css`, {nodir: true})
        ],
        extractors: [
          {
            extractor: (content) => content.match(/([a-zA-Z-]+)(?= {)/g) || [],
            extensions: ["css"],
          },
        ],
      })
    ]
}
```
具体效果来看，之前的antd.min.css是540.85KB，tree-shaking后是302.99KB，体积优化了56%，还是可以的。<br>
另外这种tree-shaking和动态主题也是兼容的，在/css-treeshaking这个目录下可以跑起来demo。


### tree-shaking的技巧和注意事项
#### 用纯函数标记来增强tree-shaking
在源码中，你经常能看见/*#__PURE__*/标注一个函数的调用，这其实就会增强tree-shaking功能。<br>
我们看这个例子：
```
function foo(info) {
    return info + '';
}

foo('be retained');

/*#__PURE__*/foo('be removed');
```
处理后的代码片段为：
```
function e(e) {
  return e + "";
}
e("be retained");
```
可以看到，后面标记为纯函数的才被tree-shaking掉了，而前面的即是实际是纯函数，也没有被优化掉。<br>
这是因为，webpack默认就不会优化函数调用。也就说，即是真的是纯函数，即是调用了对其他任何地方都完全没有任何影响也会保留。这是一个谨慎的机制，但这样可以避免出现意料之外的case导致没有分析出非纯函数导致运行时结果与预期不符。<br>
当然，如果你给了webpack保障，承诺这一定是一个无副作用的函数调用，那么webpack才会开始分析这个调用是否对其他地方有影响。比如这里`/*#__PURE__*/foo('be removed');`显然就是单纯调用，不会有任何影响，于是就被tree-shaking掉了。<br>

#### 不要让babel转译你的ESM格式代码
babel是大家的老朋友了，绝大多数项目都会用babel完成一些代码转译的工作。<br>
而babel有一个常用插件@babel/preset-env，它有一个配置项modules可以指定把js文件的导入导出格式进行转译:
"amd" | "umd" | "systemjs" | "commonjs" | "cjs" | "auto" | false, defaults to "auto".<br>
根据官方文档：https://babeljs.io/docs/en/babel-preset-env
可以看到有以上那么多的格式可供选择。<br>
需要注意的是，这里一定不要设置auto也就是默认值以外的其他任何值。<br>
因为只有esm格式才能进行模块的静态分析，进而tree-shaking掉未被使用的模块变量。至于其他格式为什么不行呢？
就以大家熟悉cjs来说吧，cjs实际上会把所有的模块变量都放到一个模块对象上去，然后是整体引入这个对象，既然是整体导入的，当然是不可能进行tree-shaking了。<br>
这里再多一嘴，可能有人疑惑不转化esm的话会不会有问题。实际上，前面webpack都说了可以静态分析esm格式的代码，webpack不需要babel进行转译，它能处理任何格式的代码，最终都统一转化为cjs like的mock function格式：
```
"./src/child.js": (e, r, s) => {},
"./src/index.js": (e, r, s) => {
  s("./src/child.js");
  function n(e) {
    return e + "";
  }
  n("be retained");
},
```

### tree-shaking的总结
1. 开发者自己的无效代码，比如定义但未被引用过的模块变量、定义但未被读取的普通变量等，需要通过这些配置完成tree-shaking:
```
optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
        new TerserWebpackPlugin()
    ]
}
```
另外要注意两点：<br>
&ensp;a. 如果你在写一个npm包，并且确定一个函数的调用是无副作用的，那么应该用`/*#__PURE__*/`对函数调用进行标记，这样你的用户在引用你的npm包时就可以tree-shaking掉你的函数和函数调用相关代码了。<br>
&ensp;b. 不要配置@babel/preset-env的modules这个配置项。<br>
2. js库的tree-shaking通常是依赖发布者提供esm格式，这样就可以按需引入，也就不需要tree-shaking了。<br>
3. css的tree-shaking，如果库提供了单独的css文件，那么也可以按需引入。不过更常见的解决方案是全量引入后，用postcss+postcss的purgecss插件完成js和html中未引用样式的tree-shaking。


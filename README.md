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
如果直接按照import 'antd/dist/antd.css';的话，这个css的体积有2MB，这肯定是无法忍受的大。<br>
当然如果只用一个组件的话，import "antd/es/button/style/index.css";就能解决问题。<br>
当然，我们还可能用其他样式，比如antd的默认样式，那就需要再引一个"antd/es/style/default.css"。<br>
但事情并没有这么简单，如果只是静态的样式，这样就可以满足了，但是2022年了，暗色主题已经被广泛应用了。<br>我们必须思考，如果需要一键切换明暗主题的话，还能这样用一个组件引一个吗？<br>
首先，我们需要明确下antd下明暗色切换的通用实践和实现原理。<br>
先澄清下，亮暗切换和动态主题并不是一回事。动态主题在antd官网有一个单独的tab来介绍，它可以用来给antd换一套主题色甚至动态改变主题色。这个功能是相当灵活的，你可以把原本蓝色的主题修改为任意颜色的主题。这意味着你需要指定一套新的主题。而暗色模式相当于是另一套主题，无需你或者你的设计伙伴设计颜色（除非你对antd默认的暗色模式不满意）。<br>
其实，亮暗切换就是antd默认主题<->antd暗色主题的过程。我们需要探讨下实现原理以及这种情况下是否还可以按需引入css<br>
我们直接说答案，能。是的，使用antd-theme-webpack-plugin插件，你完全可以既按需引入又实现动态主题。<br>
实际上，antd的样式可以分为三类：
1. default css，这里面是最泛用的默认样式，比如最重要的是会给html,body设置width/height: 100%;从而撑起来整个页面。这个文件位置在es/style/default.css，你应该单独引入它。
2. component css，组件的css。这里的组件指的是任意一个组件，比如Button组件，你需要引入Button组件的css来定义它最重要的样式，比如line-height和text-align属性决定按钮中文字的位置。
3. theme css，这就是关键了，theme css主要是文字颜色、背景色相关的样式，它和决定元素和页面基本结构的css是分离的，我们需要动态改变主题时，就单独操纵这部分css就好了。这就是既按需又动态的关键。

这三类css，前两类都没什么好说的，都是开发者开发在业务代码中引入的。theme css是重点。<br>
跑起来/dynamic-theme中的示例，我们看到theme css的存在形式是style标签。
我们先看一下theme css内容，我挑选了一个最关键的：
```
body {
  color: rgba(255, 255, 255, 0.85);
  background-color: #000;
}
```
可以看到这是body的css样式代码，在暗色模式下background-color的值为#000也就是黑色。而切换到亮色模式时，整个style标签的内容更换了，background-color变为了#fff也就是白色。<br>
那么这个style标签的内容是如何生成的？<br>
既然不是自己引入的，那么就应该是插件帮我们生成并插入的。<br>
插件的输入是一堆less变量的key-value映射，插件的输出是带有这些变量值的css，所以我们在具体看之前，先猜下插件的工作流程是：
1. 读取less变量的值和antd中消费了less变量的样式表
2. 用变量值替换less代码中消费变量的地方
3. less转译成css
4. 写入style标签并插入HTML。

而更换时执行的逻辑是调用less的运行时方法modifyVars，传入lightVars或darkVars，这俩就是普通的less变量key-value映射。调用后效果就像上面说的，style标签内的css更改了，这里一定会引起思考的，因为less接收的仅仅是一组less变量，它怎么知道这些变量要用到哪里呢？照理来说，应该是在之前有一个关联less变量的消费者和less变量的过程。<br>
我们去插件源码中去寻找，发现主要的工作有两个：
1. 找到index.html文件，在body标签中插入这段代码：
```
`
    <link rel="stylesheet/less" type="text/css" href="${this.options.publicPath}/color.less" />
    <script>
    window.less = {
        async: false,
        env: 'production'
    };
    </script>
    <script type="text/javascript" src="${this.options.lessUrl}"></script>
`
```
其中lessUrl就是less运行时的js包，上面提供了切换主题时要用的modifyVars方法。而上面的color.less是啥需要探究。
2. 调用antd-theme-generator插件的方法，生成了一个source，这个source会被emitAssets成color.less这个asset

到这里就了然了，我们在跑起来后查看这个color.less，发现就是一个消费less变量的less文件，这里的样式都是主题相关。<br>
这里我推断
```
<link rel="stylesheet/less" type="text/css" href="${this.options.publicPath}/color.less" />
```
这段代码会引入一个less文件，less的运行时会自动把这个文件转译为css并置于style标签内然后插入html完成样式的初始化。<br>
而调用less.modifyVars方法时，则会基于color.less文件和本次的参数也就是主题变量们修改色值，并且生成新的css文件并更新style标签。<br>
如果这个理论是成立的，那么我们把color.less和less运行时js两个资源都提取出来，把插件干掉，一看便知。<br>
实验结果和预期完全一致：
把public/index.html修改为这样，就可以自由地更改主题了。
```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <link rel="stylesheet/less" type="text/css" href="/color.less" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/less.js/2.7.2/less.min.js"></script>
    <div id="root"></div>
</body>
</html>
```
这里注意一个细节是link要放在body标签中而不是head标签中，因为style-loader会把内容插在head标签的末尾，如果这里写到head标签的话，最终的结果来看，default css的内容会在后面，所以优先级更高，而default css中其实就是亮色默认主题，因此导致到暗色主题后样式会因为优先级低而不生效。所以一定注意放到body标签中。<br>
所以less运行时js的工作原理确实就是检测html中的less文件的link，然后读取less内容并且转化为css。这是less的log日志
```
Rendered http://localhost:8080/color.less successfully.
less.min.js:13 CSS for http://localhost:8080/color.less generated in 204ms
```
现在我们是明白如何切换主题的核心了，但是这还不是全部，还有两个问题：
1. color.less是消费所有less变量的主题色相关样式表，那么它是如何生成出来的呢？
2. 切换亮暗时是调用的less.modifyVars，这里需要传入明暗主题的对象参数信息，这些信息是哪里来的？

先说问题1：
```
generateTheme(this.options)
    .then(sourceStr => {
        compilation.emitAsset('color.less', new RawSource(sourceStr), { size: source.length });
    })  
};
```
把插件的代码提炼后如上，可以看到是用generateTheme生成了sourceStr，然后利用webpack提供的api把sourceStr变成了color.less文件。<br>
那么generateTheme又是如何生成color.less这个用了一套less变量的<br>
generateTheme代码比较复杂，我只梳理了大致脉络是读取antdStylesFile也就是antd.less文件，这个文件包括了所有组件的样式less: component.less，全局的样式：global.less，这里面定义了body用哪个less变量。当然还有一堆其他不重要的就不多赘述。<br>
到现在，使用哪些less变量就定下了，至于less变量的值是什么就是由输入决定了。根据插件官方提供的示例，下面这些都是可以自定义的：
```
@primary-color: @black;
@select-item-selected-option-color: @primary-color;
@processing-color: @primary-color;
@select-item-selected-bg: @background-color-base;
@secondary-color: @primary-color;
@skeleton-color: @primary-color;
@btn-primary-bg: @primary-color;
```
另外，插件的示例代码中，还会用读取less变量的方法getLessVars做下面这些事：
1. 读取antd/lib/style/themes/dark.less文件，生成dark.json文件，并且最终会以对象的形式作为less.modifyVars的参数，来修改主题为暗色
2. 读取antd/lib/style/themes/compact.less文件生成light.json文件，作为亮色主题的对象。

至此，完整的流程就分析完毕了，我们总结下：
1. 在antd-theme-generator插件中，读取component.less和global.less文件，确立组件标签和全局标签的主题样式的属性和less变量的映射关系。
2. 在webpack.config.js中定义传入插件的less变量，确立了less变量和决定主题的色值等样式值的关系。注意，只有这里定义的less变量，才会被color.less使用，否则color.less中样式的值就不是变量而是固定值。这意味着如果你要某些变量可变，就要在这里定义好。
3. 把前两者合并成一个color.less资源。把color.less的引入标签link和less.min.js的引入标签script插入html。
4. less.min.js转换less资源为css，并以style标签的形式插入html，完成样式表的应用。
5. 切换暗色时，调用less.modifyVars方法，传入之前转化为dark.json的/antd/lib/style/themes/dark.less变量集，完成新css的生成以及style标签的更新。
6. 切换亮色时，官方示例是传入antd/lib/style/themes/compact.less转化的light.json变量集，不过这里个人觉得用theme.json变量集合更好一些。

自己写一个极简版的webpack插件




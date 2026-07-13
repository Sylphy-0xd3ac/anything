---
title: All in Elysia
description: 生日快乐 Elysia!
tags:
  - Nodejs
  - Elysia
  - REST
published: 2026-06-07
category: Tech
lang: zh_CN
---
# 生日快乐 Elysia!
今天是 7 月 6 日, 是 Elysia 仓库首个提交 `78aa879 ("🎉 feat: init")` 的日子, 巧合的是, 正是在2025 年的 7 月, 我第一次认识了 Elysia 这个框架.

# Ergonomic
Elysia 是我接触到的**最好**的, 最 **Ergonomic** 的 RESTful API Framework, 没有之一, 相比于不舒服的 NESTJS, 混合而又 API 繁杂的 Next.js、Koa, 俗套不顺眼的 Express.js, 真是令人心旷神怡.

```typescript
import { Elysia, file } from 'elysia' 

new Elysia() 
  .get('/', 'Hello World')
  .get('/image', file('mika.webp'))
  .get('/stream', function* () { 
    yield 'Hello' 
    yield 'World' 
  })
  .ws('/realtime', { 
    message(ws, message) { 
      ws.send('got:' + message) 
    } 
  })
  .listen(3000)
```
简洁, 优雅, 人性化.
没有令人作呕的 Response, 令人心烦的构造Readable Stream, 令人困扰的 Protocol Upgrade, 令人放弃的编写, 
只有简洁的 Generator `yield`, 简洁的 `file()`, `sse()`, 内置的 `.ws('/ws')`,
`A framework that feels just like JavaScript`.
如同  `JavaScript` 一样舒适的,
高性能框架.
![这还是解释性语言嘛...](assets/images/Screen%20Shot%202026-07-06%20at%2011.39.15.png)

## 返回即响应
在别的框架里, "把东西写回给客户端" 是一件充满仪式感的事: `res.setHeader(...)`, `res.status(200)`, `res.json(...)`, `res.end()`, 一步都不能少. 忘了 `res.end()`? 那请求就那么干挂着, 直到超时.

Elysia 把这一整套仪式砍到只剩一个动作: **你 `return` 什么, 客户端就收到什么.**
```typescript
new Elysia()
  .get('/text', () => 'Hello')                     // → text/plain
  .get('/json', () => ({ hello: 'world' }))        // → application/json, 自动序列化
  .get('/file', () => file('video.mp4'))           // → 自动推断 Content-Type + Range 分片
  .get('/stream', function* () {                   // → 分块流式传输
    yield 'chunk 1'
    yield 'chunk 2'
  })
  .get('/raw', () => new Response('escape hatch'))  // → 想完全掌控时, 原生 Response 照收
```
返回字符串就是 `text/plain`, 返回对象自动 JSON 序列化并带上正确的 `Content-Type`, 返回 `file()` 自动处理 MIME 类型与 `Range` 请求, 返回 Generator 就是分块流. 哪天你实在想手搓, 直接 `return new Response(...)`, Elysia 也原样放行 -- 它给你的是便利, 而不是牢笼.

## 生命周期读起来就是英语
一个请求从进来到出去, Elysia 把每个阶段都开成了一个能挂钩子的口子, 而且名字直白得像在读英语:
```typescript
new Elysia()
  .onRequest(() => { /* 最早的口子, 路由都还没匹配 */ })
  .onParse(() => { /* 解析 body */ })
  .onTransform(() => { /* 校验前改写 context */ })
  .onBeforeHandle(() => { /* 校验后、handler 前 —— 鉴权、限流挂这 */ })
  .onAfterHandle(() => { /* handler 后、响应前 —— 统一包装返回值 */ })
  .onError(() => { /* 出错兜底 */ })
  .onAfterResponse(() => { /* 响应已发出 —— 打点、日志 */ })
```
后面 `limiter` 副实例里的那个 `onBeforeHandle`, 就是往 "校验后、handler 前" 这个口子里塞了一段限流逻辑. 你不需要在脑子里推演 "洋葱模型的第几层", 只要问自己一句 "我想在哪个时刻插一脚", 然后挑名字对得上的那个钩子, 就完事了.

本篇意义并不是介绍所有 Elysia API, 故此不在过多赘述, 只写我认为惊世骇俗的几点(~~作者是个好看的男娘~~).

# 继承
在其他框架使用中间件与路由分离架构时, Elysia 不走寻常路, 在实例上挂上了路由与中间件的两个 API, 与此同时还提供了 `.use()` 用于继承一个实例所具有的全部属性, 如 `decorator`, `store`, 路由, 中间件等. 使得其从一大堆俗套的框架中脱胎而出.
## All in Elysia
在 Elysia 的设计下, 一个后端服务完全可以被抽象为一个通过继承扩展的 Elysia 实例,
我将其中的 Elysia 实例分为两类:
- 主实例 -- 此类实例负责受理 api 请求并进行处理, 调用副实例提供的辅助操作执行 api 逻辑, 获取副实例提供的中间件处理后的信息的等.
- 副实例 -- 此类实例通过`decorator`, `store`, `derive`, `resolve` 为主 Elysia 实例提供必要的操作, 如提供中间件验证凭证及转发信息到主实例, 提供工具类函数如验证密码哈希, 存储重载配置等, 不会受理 api 请求.
这是一个典型的副实例: 
```typescript
export const limiter = (memory: RateLimiterMemory) => new Elysia({ name: 'limiter' })
  .use(limit)
  .onBeforeHandle(async ({ checkRateLimit, set }) => {
    const result = await checkRateLimit(memory);
    if (!result.success) {
      set.status = 429;
      set.headers['Retry-After'] = (result.retryAfter || 60).toString();
      set.headers['X-RateLimit-Limit'] = memory.points;
      set.headers['X-RateLimit-Remaining'] = result.remaining ?? 0;
      set.headers['X-RateLimit-Reset'] = new Date(Date.now() + (result.retryAfter || 60) * 1000).toISOString();
      
      return {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      };
    }
  });
```
该实例提供了一个 BeforeHandle 中间件, 用于进行 rate limit, 为主实例服务.

典型的主实例:
```typescript
export const login = new Elysia()
  .use(access)
  .use(db)
  .post('/login', async ({ body, jwt, set, store: { User, cookieConfig }, verifyHash, setCookie }) => {
    const user = await User.findOne({ username: body.username });
    if (!user) {
      logger.info(`User ${body.username} logged in failed`);
      set.status = 401;
      return { error: 'Invalid credentials' };
    }
    
    try {
      const isValid = await verifyHash(body.password, user.hash);
      if (!isValid) {
        logger.info(`User ${body.username} logged in failed`);
        set.status = 401;
        return { error: 'Invalid credentials' };
      }
    } catch (error) {
      logger.info(`User ${body.username} logged in failed`);
      set.status = 401;
      return { error: 'Invalid credentials' };
    }

    const token = await jwt.sign({ 
      id: user._id.toString(), 
      username: user.username 
    });

    logger.info(`User ${user.username} logged in successfully`);
    
    setCookie('token', token, cookieConfig);

    return { 
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        level: user.level
      }
    };
  }, loginSchema);
```
该实例提供了 `/login` 接口, 用于注册用户, 继承了 access 以及 db 副实例, access 副实例继承了 auth 实例 (就是展示的副实例), 并调用了副实例的装饰器, 中间件, Mongooose 实例等.

通过以上两个实例, 你应该明白了什么是 All in Elysia, 借助 Elysia 的继承扩展性, 将整个后端抽象为一个继承套继承的 Elysia 实例, 最终在程序主入口运行主实例.

## `name`: 继承不怕重复
你可能注意到副实例都带了个 `name`:
```typescript
new Elysia({ name: 'limiter' })
```
这不是给人看的注释, 而是给 Elysia 看的**去重键**. 当你把后端拆成一棵继承树, 同一个副实例几乎必然被多个主实例 `.use()` 到 -- `db` 被 login 用, 也被 register 用, 还被 profile 用. 如果每 `.use()` 一次就真的重新装一遍中间件, 那这棵树跑起来就是灾难: 一次请求把同一段限流逻辑跑上五遍.

有了 `name`, Elysia 会认出 "这是同一个插件", 无论你在树里 `.use()` 它多少次, 它都只会被真正应用一次. 这就是 "继承套继承" 不会滚成雪球的底气 -- 你尽可以在任何需要它的地方放心 `.use()`, 而不必在脑子里维护一张 "谁已经装过、谁还没装" 的表.

## 封装: 副实例不会污染主实例
Elysia 还有一个容易被忽略、却极其重要的默认行为: **副实例里注册的生命周期钩子, 默认是局部的.**

意思是, `limiter` 里的 `onBeforeHandle` 只作用于 `limiter` 自己 (以及直接挂在它上面的路由), 它**不会**因为被 `.use()` 就悄悄泄漏到主实例的每一个路由上. 这跟传统框架 "`app.use(mw)` 之后全局生效, 想局部还得自己 `if` 判断路径" 的默认恰好相反.

想让一个钩子往上传播, 你得**显式**声明:
```typescript
new Elysia({ name: 'auth' })
  .onBeforeHandle(() => { /* ... */ })
  .as('scoped')    // 传播到直接 use 它的那一层
  // .as('global') // 或者一路传播到整棵树
```
默认局部、按需放开 -- 这让副实例成了真正的 "零副作用积木": 你 `.use()` 它, 只会拿到你想要的东西 (装饰器、store、以及它主动暴露的钩子), 而不会平白多出一堆你没预期的行为. 拆得越散, 越不怕彼此打架.

## 主入口: 把树拼起来点火
拆得再散, 最后也要有个地方把它们收拢成一个应用. 这就是主入口干的事 -- 把所有主实例 `.use()` 到一起, 然后 `.listen()`:
```typescript
const app = new Elysia()
  .use(login)
  .use(register)
  .use(profile)
  .use(limiter(memory))
  .listen(3000)

export type App = typeof app  // 顺手把整棵树的类型固化成一个 App
```
一棵继承套继承的实例树, 到这里收拢成一个 `app`, 一行 `.listen(3000)` 点火. 这, 就是 All in Elysia.

# Type-Driven
上一章节讲的是 Elysia 的 **Ergonomic** -- 写起来爽. 但真正让 Elysia 从一堆 "写起来爽" 的框架里脱胎而出的, 是它的另一面: **Type-Driven**.

在 Elysia 里, 你几乎不需要手写任何一个泛型参数, 不需要 `as`, 不需要 `Request<Params, ResBody, ReqBody>` 这种令人头皮发麻的三段式声明. 你只管写逻辑, 类型自己会流下来. 一次定义, 处处推导.

这不是 "有类型" 那么简单的事, 这是把类型系统当成一等公民来设计整个框架.

## 强推导
先看最朴素的一个例子:
```typescript
import { Elysia, t } from 'elysia'

new Elysia()
  .post('/user', ({ body }) => {
    // body: { name: string; age: number }
    return `${body.name} is ${body.age}`
  }, {
    body: t.Object({
      name: t.String(),
      age: t.Number()
    })
  })
```
注意, 我**没有**为 handler 写任何类型标注. `body` 的类型 `{ name: string; age: number }` 是 Elysia 从后面那个 `t.Object({...})` schema **反向推导**出来的. 你改一下 schema, handler 里的 `body` 类型立刻跟着变, `body.age` 忘了它是 number 直接给你标红.

这就是 Elysia 的第一层魔法: **Schema 是唯一真相**. 你写一份 schema, 它同时是:
- 运行时的校验规则 (Validation)
- 编译期的 TypeScript 类型 (Inference)

而 context 里的所有东西 -- `body`, `query`, `params`, `headers`, `cookie`, `store`, `set` -- 无一例外, 全都有类型. 不是 `any`, 不是 `unknown`, 是精确到字段的类型.
```typescript
new Elysia()
  .get('/search/:category', ({ params, query }) => {
    // params: { category: string }
    // query:  { page: number }
    return { category: params.category, page: query.page }
  }, {
    params: t.Object({ category: t.String() }),
    query:  t.Object({ page: t.Numeric() })  // t.Numeric: 字符串自动 coerce 成 number
  })
```
`params.category` 从路径 `:category` 推出来, `query.page` 经过 `t.Numeric()` 直接就是 `number` 类型 -- 连 URL query 天然是字符串这件恶心事都替你处理好了.

## 继承套继承, 类型不掉一根毛
前面「继承」一节说过, Elysia 用 `.use()` 把整个后端抽象成一个 "继承套继承" 的实例树. 那么问题来了: **继承这么多层, 类型还能撑得住吗?**

答案是: 撑得住, 而且一根毛都不掉.

先看副实例往 context 里塞东西的几种方式, 它们**全部**带着类型往下传:
```typescript
const setup = new Elysia({ name: 'setup' })
  .decorate('db', new Database())            // 挂一个实例
  .state('version', '1.0.0')                 // 挂一个 store
  .derive(() => ({ requestId: crypto.randomUUID() }))  // 每个请求派生
```
`decorate` 挂的 `db`, `state` 挂的 `version`, `derive` 派生的 `requestId` -- 三种完全不同的机制, 但在继承它的实例里, 它们都是有类型的:
```typescript
const app = new Elysia()
  .use(setup)
  .get('/', ({ db, store: { version }, requestId }) => {
    // db:        Database
    // version:   string
    // requestId: string
    // 全部有类型, 全程无 any
  })
```
真正惊世骇俗的是**深层继承**. 你套三层, 套五层, 套十层, 类型照样从最底下一路流到最上面:
```typescript
const a = new Elysia().decorate('a', 1)
const b = new Elysia().use(a).decorate('b', 'two')
const c = new Elysia().use(b).decorate('c', true)

const app = new Elysia()
  .use(c)
  .get('/', ({ a, b, c }) => {
    // a: number, b: string, c: boolean
    // 从三个不同层级继承来的, 类型精确, 一个不差
  })
```
这才是 "All in Elysia" 能成立的根基 -- 如果继承一多类型就崩成 `any`, 那所谓 "把后端抽象成一棵实例树" 就是空中楼阁, 中看不中用. 但 Elysia 硬是让类型**穿透了任意深度的继承链**, 你在最外层的 handler 里, 依然能拿到最底层副实例提供的每一个装饰器、每一份 store、每一个 derive/resolve 的结果, 且全部精确到字段.

顺带一提, `derive` 和 `resolve` 的区别也体现了这套类型系统的克制:
- `derive` 在校验**之前**运行, 拿不到已校验的 `body`
- `resolve` 在校验**之后**运行, 能安全地用上 `body` / `query` 这些已经是精确类型的东西
```typescript
const auth = new Elysia()
  .resolve(({ headers }) => {
    // 此时 headers 已经过 schema 校验, 类型精确
    const token = headers.authorization
    return { user: verify(token) }  // user 带着类型继续往下传
  })
```

## Validation
既然 Schema 是唯一真相, 那 Validation 就不是 "额外加的一层", 而是这份真相在运行时的自然投影.

你写的每一个 `t.Object`, 既约束了类型, 也约束了运行时的数据. 校验不通过, 请求根本进不到你的 handler:
```typescript
const loginSchema = {
  body: t.Object({
    username: t.String({ minLength: 3, maxLength: 32 }),
    password: t.String({ minLength: 8 }),
    email: t.Optional(t.String({ format: 'email' }))
  })
}

new Elysia()
  .post('/login', ({ body }) => {
    // 能走到这里, body 就一定合法:
    // username 长度 3~32, password 至少 8 位, email 若存在则格式合法
    return signIn(body)
  }, loginSchema)
```
`minLength`, `format: 'email'` 这些约束**只存在于运行时** -- 它们是 TypeScript 类型表达不了的. Elysia 底层用 [TypeBox](https://github.com/sinclairzx81/typebox), 编译成极快的校验函数, 所以你既拿到了编译期的 `string` 类型, 又拿到了运行期 "长度必须 3~32" 的保证. 两个世界, 一份 schema.

### Reference Model
schema 写多了会重复, Elysia 提供了 `.model()` 把 schema 注册成可复用的命名模型:
```typescript
const app = new Elysia()
  .model({
    user: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .post('/sign-up', ({ body }) => body, { body: 'user' })  // 直接用名字引用
  .post('/sign-in', ({ body }) => body, { body: 'user' })
```
引用 `'user'` 字符串, 类型照样推得出来 -- 连字符串引用都是类型安全的.

### 错误就是数据
校验失败时, Elysia 抛出的不是一句干巴巴的 500, 而是结构化的、字段级的错误. 你可以统一接管:
```typescript
new Elysia()
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422
      return {
        message: 'Validation failed',
        // error 里带着精确到哪个字段、期望什么、实际是什么
        detail: error.all
      }
    }
  })
```
`code` 是一个联合类型, `'VALIDATION' | 'NOT_FOUND' | 'PARSE' | ...`, 你在 `if (code === 'VALIDATION')` 之后, `error` 会被**收窄**成校验错误的具体类型 -- 又是类型系统在替你干活.

### 不止 TypeBox
如果你团队里已经在用 Zod / Valibot / ArkType, 也不用推倒重来. Elysia 支持 [Standard Schema](https://github.com/standard-schema/standard-schema), 这些库的 schema 可以直接塞进去, 该推导的一样推导:
```typescript
import { z } from 'zod'

new Elysia()
  .post('/user', ({ body }) => body, {
    body: z.object({
      name: z.string(),
      age: z.number()
    })
  })
  // body 依然被推导为 { name: string; age: number }
```

# 尾声
写到这里, 我想说的 Elysia 的三面也就凑齐了:

- **Ergonomic** -- 一个 `file()`, 一个 `yield`, 一个 `.ws()`, 写起来像 JavaScript 本身一样舒适;
- **All in Elysia** -- 借着 `.use()` 的继承扩展, 把整个后端抽象成一棵继承套继承的实例树, 主实例受理请求, 副实例默默供给;
- **Type-Driven** -- 从一个 handler 的 `body`, 到穿透十层继承的 `decorate`, 再到运行时的 `Validation`, 类型贯彻到了每一个角落, 编译期与运行期共用同一份真相.

这三面其实是同一件事: **让你只写逻辑, 剩下的框架替你兜住.** 你不追着类型跑, 是类型追着你的代码跑; 你不迁就框架的套路, 是框架迁就你脑子里的模型.

`A framework that feels just like JavaScript` -- 但它比 JavaScript 更懂你想要什么.~~其实是因为 JavaScript 没有类型(?~~

所以, 生日快乐, Elysia.

---

PS: 有一回 `tsc` 突然给主播甩脸子, 发现是类型定义问题, 主播嫌一个个理清太麻烦, 大手一挥, 把那个被一堆实例反复 `.use()` 的中间件直接标了个 `AnyElysia` 草草了事. 重点来了 -- **`any` 是会传染的啊……** 一个 `AnyElysia` 顺着继承链一路蔓延, 把上面吹了半天的 Type-Driven 腐蚀了个干净. 于是主播就再也没能享受上自己吹的推导. (
后来追查半天, 罪魁祸首竟是随手写的 `import { Elysia }` 而不是 `import Elysia`, 愣是没把 Elysia 的类型定义带上. 

PS2: 虽然不是生日那天的, 但是也算生日礼物(? 见 [elysiajs/elysia#1939](https://github.com/elysiajs/elysia/pull/1939). 还没合, 求 GG 翻牌 (逃

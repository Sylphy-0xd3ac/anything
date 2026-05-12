---
title: Stream
description: REST + SSE and WebSocket.
published: 2026-11-05
tags:
  - WebSocket
  - SSE
  - REST
category: Tech
draft: false
lang: zh_CN
---
# 引言
Stream 主流两个协议: REST + SSE、WebSocket, 特作此文讨论。

# REST + SSE
 我经常遇到使用 WebSocket 的应用或规范，但其中有些使用方式并不优雅. 对于“客户端调用 API，服务端推送事件”这类模型, REST + SSE 往往比 WebSocket 更符合语义. OneBot V11 就是一个典型例子.

## OneBot V11
作为 QQ 非官方机器人的主流协议, OneBot V11 的大部分 feature 已经被各类框架完整支持, 但它的通信设计也存在一些历史包袱.
OneBot V11 规范了多种通信方式：基于 HTTP 的 API 调用、基于 HTTP POST 的事件上报，以及正向 / 反向 WebSocket。其中，HTTP API 用于 API 调用，HTTP POST 用于 Event 上报WebSocket 则可按 endpoint / client role 同时或分别承载 API 与 Event.
问题在 WebSocket 的 `/` 接口上, 它在同一条连接中同时承载 API Result 和 Event.
那么，OneBot V11 如何让调用方在 WebSocket `/` 接口中获取某次 API 调用对应的 response 呢?
WebSocket 只提供一条有序消息流，消息本身并没有天然的 request-response 绑定,
即使 API Result 本身严格按发送顺序返回, 只要 / 连接里混有 Event, 60 RPM 下仍有约 18.72% 概率让 naive 框架把 Event 当 API Result 读. 从而触发 null property.
OneBot V11 给出的答案是: echo.
客户端在调用 API 时携带一个唯一的 echo, OneBot 实现在返回 API Result 时会原样带回这个字段。客户端再通过 echo 将返回消息与先前发出的 API 调用关联起来. 换句话说, OneBot V11 在 unpaired 的 WebSocket 消息流之上, 手动构造了一层 paired / correlated 语义.
OneBot V11 实际上也意识到了 API Result 和 Event 混在同一条 WebSocket 连接里会带来分发问题, 因此 BotUniverse 额外规范了 /api、/event 和 / 三个 WebSocket 终结点: /api 仅用于 API 调用及其返回, /event 仅用于事件推送, / 则同时承载两者。
但这暴露出了另一个设计问题: 既然 /event 已经是单向事件流，而 /api 本质上仍然是一次请求对应一次返回，那么为什么不直接采用更符合语义的 REST + SSE？

## Milky
这种设计取向在 Milky 中体现得更明显。 Milky 将 API 调用固定在 HTTP POST /api/:api 上，事件推送则支持 SSE、WebSocket 和 WebHook；当使用 SSE 作为事件通道时，它呈现出 HTTP API + SSE 的通信模型。

## When SSE
不仅 OneBot V11, 很多应用在设计实时接口时都喜欢使用 WebSocket, 但 WebSocket 适用于客户端快速、频繁、低延迟的发送场景, 例如协作、游戏同步等, 其他情况下使用 SSE + REST 是更好的选择.
此外, SSE 本质上是保持一个 HTTP 连接, 因此它支持 HTTP 的全部 feature, 这是另外一个好处.

## REST + SSE 之限
REST + SSE 的优势在于简单, 但它并不是 WebSocket 的完整替代品. SSE 是单向的, 是服务端向客户端推送事件. REST 是向服务端用额外的 HTTP API 推送请求, 每次都需要起一个HTTP Req.
此外，SSE 本质上是文本流，不适合直接传输二进制数据. 浏览器原生 `EventSource` 对请求方法和自定义 header 的支持也比较受限. 对于复杂鉴权、二进制流、高频双向控制等场景, SSE 会逐渐变得复杂、不自然.

# WebSocket
刚才讲到了 SSE + REST 可以实现 WebSocket 的功能, 不过, WebSocket 在低延迟, 频繁, 双向的领域仍然拥有绝对的统治力, 其单次双向连接是 REST + SSE 不可替代的, 本段主要围绕 WebSocket 的特性, 生态来讲.

## Paired or Unpaired
我有时在想, WebSocket 是不是应该提供 Paired 的能力, 如果 WebSocket 原生支持 request-response correlation, 那么上面讨论的很多问题都会更容易处理.
但 WebSocket 的出现就是为了更加底层类 Socket, 突破 HTTP req-res 的限制, 只提供一条双向、有序的消息流. 事件, 配对全部由上游生态库提供.
因此，WebSocket 本身保持 unpaired 并不是错误。问题不在于 WebSocket 不提供 paired 语义，而在于某些协议明明只需要“API 调用 + 事件推送”，却仍然把它们塞进同一条 WebSocket 消息流里，再在应用层重新发明一套 correlation 机制。

## When WebSocket
REST + SSE 对比 WebSocket 最大的缺陷就是发. REST 每次客户端发送控制消息都要发起一次独立 HTTP request。相比 WebSocket 的同一条双向连接，它需要额外维护 session id、请求顺序和状态同步，在高频双向交互里会变得别扭。
何时该使用 WebSocket: 
- 需要高频、低延迟地发送小消息;
- 客户端和服务端都需要在同一上下文中通信;
- 模型本身是一个双向流，而不是单次请求。
因此, 在如同在线协作、网页游戏等领域 WebSocket 仍然占有非常重要的地位.


## WebSocket as Transport
WebSocket 给开发者提供了一条很自由的双向消息流, 但它本身并不提供多少上层语义. 连接保活、心跳、重连、鉴权、消息类型、请求关联、错误格式、超时、背压、状态恢复，都需要协议或框架自己设计. 
这正是 WebSocket 的优势，也是它的成本. HTTP 规范化的 req-res paired 是它的优势, 也是它的弱势. 所以更类底层 Socket 的 WebSocket 诞生. 它适合作为更上层协议的 transport: 你可以在上面实现 RPC、pub/sub、协作同步、终端会话、游戏同步, 也可以实现自定义的流式控制协议. 但如果业务本身只是 request-response + event stream, 那么直接使用 HTTP API + SSE 往往更清晰. 
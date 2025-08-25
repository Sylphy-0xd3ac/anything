---
title: 浅谈ESM模块下的HMR
published: 2025-08-25
description: '众所周知,Node.js在加载模块时是有模块缓存的.在CJS模块环境下,我们可以通过require.cache来获取模块缓存,这为CJS环境下HMR(模块热插拔)提供了可能.然而,在ESM环境下,import(包括动态函数)被挂为了v8语法钩子,无法访问模块缓存.本文将浅谈ESM模块环境下的HMR实现.'
image: ''
tags: ["Node.js","HMR","ESM"]
category: 'Tech'
draft: false 
lang: 'zh_CN'
---
那个为了易维护性把动态import函数一起挂为v8语法钩子的Node.js贡献者我谢谢你😡

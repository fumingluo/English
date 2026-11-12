# English Windows 全局单词悬浮助手

这是独立于 English 网页主界面的 Windows 桌面伴侣。它使用 Electron 创建透明、无边框、置顶窗口，并通过仅监听本机回环地址的 WebSocket（127.0.0.1:17321）接收网页当前词汇状态。

## 当前版本范围

- 桌面置顶小窗：单词、音标、释义、例句、播放进度。
- 拖动窗口；托盘菜单显示/隐藏/退出。
- 上一个、播放/暂停、下一个控制指令回传网页。
- 首次同步播放列表后，桌面端可使用 Windows 系统语音独立播放；关闭网页不影响已同步队列继续播放。
- 桌面端播放控制独立于网页；启动桌面播放时会尝试暂停网页端，避免双重播放。
- 当前桌面独立播放使用 Windows 已安装的语音，不调用网页端 ElevenLabs 音频缓存。
- 目前是 MVP 骨架；网页桥接接入后才会显示真实词汇。

## Windows 开发运行

需要 Node.js 20 或更新版本。

```powershell
cd desktop
npm install
npm start
```

## 打包安装程序

```powershell
npm run dist
```

安装包输出在 `desktop/dist/`。

## 通信

网页连接 `ws://127.0.0.1:17321`，发送 `{type:"state", word, phonetic, meaning, example, exampleZh, queue, mode, gap, rate, loop, segment, segmentZh, playing, index, total}`。桌面端回传 `{type:"control", action:"prev"|"toggle"|"next"}`。只允许来自 GitHub Pages 项目域名及本地开发域名的 Origin。

## 注意

透明窗口、置顶窗口属于普通桌面窗口；独占全屏程序、Windows 安全桌面或以管理员权限运行的应用可能遮挡它。第一版不承诺在这些特殊界面之上显示。

const express = require('express')
const WebSocket = require('ws')

const app = express()
const cors = require('cors')
app.use(cors())
// 创建WebSocket服务器
const server = require('node:http').createServer(app)
const wss = new WebSocket.Server({ server })

wss.on('connection', (socket) => {
  console.log('WebSocket连接已建立')

  // 监听客户端发送的消息
  socket.on('message', (message) => {
    console.log(`接收到客户端消息：${message}`)

    // 向客户端发送消息
    socket.send('Hello Client!')
  })

  // 监听连接关闭事件
  socket.on('close', () => {
    console.log('WebSocket连接已关闭')
  })
})

server.listen(3000, () => {
  console.log('服务器已启动，监听端口3000')
})

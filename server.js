const cors = require('cors')
const socket = require('socket.io')
const express = require('express')
const http = require('http')

const app = express()
const server = http.createServer(app)
const io = new socket.Server(server)

app.use(express.static('public'));
app.use(express.json())
app.use(cors({ origin: '*', credentials: true }))

io.use(async (socket, next) => {
    try {
        const room = socket.request.headers['room']
        const user = socket.request.headers['user']

        if (!room) 
            throw new Error('Room header not found.')

        if (!user) 
            throw new Error('User header not found.')

        const roomMembers = await io.in(room).fetchSockets()
        if (roomMembers.filter(x => x.username === user).length > 0)
            throw new Error(`User "${ user }" already joined "${ room }" room.`)

        socket.username = user
        socket.inroom = room

        next()
    } catch (error) {
        console.log(error.message)
        next(error)
    }
})

io.on("connection", async (socket) => { 
    const peers = await io.in(socket.inroom).fetchSockets()
    socket.join(socket.inroom)

    socket.broadcast.to(socket.inroom).emit('new_peer', socket.id)
    socket.emit('add_available_peers', peers.map(peer => peer.id))

    console.log(`Peer "${ socket.id }" joined "${ socket.inroom }" room.`)



    socket.on('offer', async ({ peer_id, session_description }) => {
        if (peer_id === socket.id)
            return

        io.to(peer_id).emit('coming_offer', {
            peer_id: socket.id,
            session_description: session_description
        })

        console.log(`Send offer to peer "${ peer_id }": ${ session_description }`)
    })

    socket.on('answer', ({ peer_id, session_description }) => {
        if (peer_id === socket.id)
            return

        io.to(peer_id).emit('coming_answer', {
            peer_id: socket.id,
            session_description: session_description
        })

        console.log(`Answer to peer "${ peer_id }" offer: ${ session_description }`)
    })

    socket.on('ice_candidate', ({ peer_id, ice_candidate }) => {
        if (peer_id === socket.id)
            return

        io.to(peer_id).emit('coming_ice_candidate', {
            peer_id: socket.id,
            ice_candidate: ice_candidate
        })

        console.log(`Relay ICE Candidate to peer "${ peer_id }": ${ ice_candidate }`)
    })

    socket.on('disconnect', () => {
        socket.broadcast.to(socket.inroom).emit('remove_peer', socket.id)
        console.log(`Peer "${ socket.id }" disconnected.`)
    })

})


server.listen(4949, () => console.log('server listening on *:4949'))
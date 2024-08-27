const io = require('socket.io-client')


let peers = {}

socket = io.connect('http://localhost:4949', {
    autoConnect: true,
    reconnection: true,
    extraHeaders: {
        user: 'aldi',
        room: 'jamaah'
    }
})

socket.on('connect', async (test) => {
    console.log('Connected')
})

socket.on('error', err => {
    console.log(err)
})

socket.on('new_peer', (peer_id) => {
    if (peer_id in peers)
        return

    peers[peer_id] = 1

    console.log(`New peer joined: ${ peer_id }`)
    console.log(`Current peers: ${ JSON.stringify(peers) }`)
})

socket.on('remove_peer', (peer_id) => {
    delete peers[peer_id]

    console.log(`Peer leave: ${ peer_id }`)
    console.log(`Current peers: ${ JSON.stringify(peers) }`)
})

socket.on('add_available_peers', (peers_ids_available) => {
    peers_ids_available.forEach(peer_id => {
        if (peer_id in peers)
            return

        peers[peer_id] = 1
    })

    console.log(`Peers available in room: ${ JSON.stringify(peers_ids_available) }`)
    console.log(`Current peers: ${ JSON.stringify(peers) }`)
})

socket.on('disconnect', (reason) => {
    console.log('Disconnected: ' + reason)
})



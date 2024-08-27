(() => {

    let peers = {}
    let socket = null
    let connected = false

    function createPeer (peer_id) {
        const peer = new RTCPeerConnection({
            iceServers: [{
                urls: [
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302', 
                    'stun:stun2.l.google.com:19302',
                    'stun:stun3.l.google.com:19302',
                    'stun:stun4.l.google.com:19302',
                ]
            }]
        })

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    peer_id: peer_id,
                    ice_candidate: event.candidate
                })
            }
        }

        peer.onconnectionstatechange = e => {
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                console.log(`Peer ${ peer_id } disconnected`)
            } 
            else if (peer.connectionState === 'connected') 
                console.log(`Peer ${ peer_id } ready`)
        }

        // peer.ontrack = e => document.getElementById('user-2').srcObject = e.streams[0]
        // peer.addTransceiver("video", { direction: "recvonly" })

        return peer
    }

    async function init () {
        if (connected)
            return

        socket = io.connect('/', {
            autoConnect: true,
            reconnection: false,
            extraHeaders: {
                user: document.getElementById('user').value,
                room: 'jamaah'
            }
        })

        socket.on('connect', () => {
            console.log('Socket connected')
            console.log('Peer ID:', socket.id)
            console.log()
            connected = true
        })
    
        socket.on('new_peer', (peer_id) => {
            if (peer_id in peers)
                return

            peers[peer_id] = createPeer(peer_id)
            console.log('New Peer:', peer_id)
        })

        socket.on('remove_peer', peer_id => {
            if (!(peer_id in peers))
                return

            peers[peer_id].close()
            delete peers[peer_id]

            console.log('Remove Peer:', peer_id)
        })

        socket.on('add_available_peers', (peers_id) => {
            peers_id.forEach(async peer_id => {
                if (peer_id in peers)
                    return
        
                const peer = createPeer(peer_id)
                const offer = await peer.createOffer()
                await peer.setLocalDescription(offer)

                peers[peer_id] = peer
                socket.emit('offer', {
                    peer_id: peer_id,
                    session_description: offer
                })

                console.log('Send Offer:', peer_id)
            })
        })

        socket.on('coming_offer', async ({ peer_id, session_description }) => {
            console.log('Coming Offer:', peer_id, session_description)

            const peer = peers[peer_id]
            const desc = new RTCSessionDescription(session_description)
            await peer.setRemoteDescription(desc)

            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)

            socket.emit('answer', {
                peer_id: peer_id,
                session_description: answer
            })

            console.log('Send Answer:', peer_id)
        })

        socket.on('coming_answer', async ({ peer_id, session_description }) => {
            console.log('Coming Answer:', peer_id, session_description)

            const peer = peers[peer_id]
            const desc = new RTCSessionDescription(session_description)
            await peer.setRemoteDescription(desc)
        })

        socket.on('coming_ice_candidate', async ({ peer_id, ice_candidate }) => {
            console.log('Coming Ice Candidate:', peer_id, ice_candidate)

            const peer = peers[peer_id]
            const candidate = new RTCIceCandidate(ice_candidate)
            await peer.addIceCandidate(candidate)
        })

        socket.on('disconnect', reason => {
            console.log('Socket disconnected')

            for (const key in peers) {
                peers[key].close()
                delete peers[key]
            }

            connected = false
            peers = { }
        })
    }

    window.onbeforeunload = () => socket.disconnect()
    document.getElementById('start').onclick = init

})()
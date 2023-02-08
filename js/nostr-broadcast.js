let events = {}
const subsId = 'my-sub'

// decode nip19 ('npub') to hex
const npub2hexa = (npub) => {
  let { prefix, words } = bech32.bech32.decode(npub, 90)
  if (prefix === 'npub') {
    let data = new Uint8Array(bech32.bech32.fromWords(words))
    return buffer.Buffer.from(data).toString('hex')
  }
}

// parse inserted pubkey
const parsePubkey = () => {
  const input = $('#pubkey').val()
  return input.match('npub1') ? npub2hexa(input) : input
}

// download json file
const downloadFile = (data) => {
  const prettyJson = JSON.stringify(data, null, 2)
  const tempLink = document.createElement('a')
  const taBlob = new Blob([prettyJson], { type: 'application/json' })
  tempLink.setAttribute('href', URL.createObjectURL(taBlob))
  tempLink.setAttribute('download', 'nostr-broadcast.json')
  tempLink.click()
}

// fetch events from relay, returns a promise
const fetchFromRelay = async (relay, pubkey) =>
  new Promise((resolve, reject) => {
    try {
      // prevent hanging forever
      setTimeout(() => reject('timeout'), 20_000)
      const ws = new WebSocket(relay)
      // subscribe to events filtered by author
      ws.onopen = () => {
        ws.send(JSON.stringify(['REQ', subsId, { authors: [pubkey] }]))
      }

      // Listen for messages
      ws.onmessage = (event) => {
        const [msgType, subscriptionId, data] = JSON.parse(event.data)
        // event messages
        if (msgType === 'EVENT' && subscriptionId === subsId) {
          const { id } = data
          // prevent duplicated events
          if (events[id]) return
          else events[id] = data
          // show how many events were found until this moment
          $('#events-found').text(`${Object.keys(events).length} events found`)
        }
        // end of subscription messages
        if (msgType === 'EOSE' && subscriptionId === subsId) resolve()
      }
      ws.onerror = (err) => reject(err)
    } catch (exception) {
      reject(exception)
    }
  })

// send events to a relay, returns a promisse
const sendToRelay = async (relay, data) =>
  new Promise((resolve, reject) => {
    try {
      // prevent hanging forever
      setTimeout(() => reject('timeout'), 20_000)
      const ws = new WebSocket(relay)
      // fetch events from relay
      ws.onopen = () => {
        for (evnt of data) {
          ws.send(JSON.stringify(['EVENT', evnt]))
        }
        ws.close()
        resolve(`done for ${relay}`)
      }
      ws.onerror = (err) => reject(err)
    } catch (exception) {
      reject(exception)
    }
  })

// query relays for events published by this pubkey
const getEvents = async (pubkey) => {
  // wait for all relays to finish
  await Promise.allSettled(relays.map((relay) => fetchFromRelay(relay, pubkey)))
  // return data as an array of events
  return Object.keys(events).map((id) => events[id])
}

// broadcast events to list of relays
const broadcastEvents = async (data) => {
  await Promise.allSettled(relays.map((relay) => sendToRelay(relay, data)))
}

// button click handler
$('#broadcast').on('click', async () => {
  // reset hash of events
  events = {}
  // messages to show to user
  const txt = {
    check: '&#10003;',
    broadcasting: 'Broadcasting to relays... ',
    fetching: 'Fetching from relays... ',
    download: 'Downloading json file... &#10003;',
  }
  // parse pubkey ('npub' or hexa)
  const pubkey = parsePubkey()
  if (!pubkey) return
  // disable button (will be re-enable at the end of the process)
  $('#broadcast').prop('disabled', true)
  // inform user that app is fetching from relays
  $('#fetching-status').text(txt.fetching)
  // show and update fetching progress bar
  $('#fetching-progress').css('visibility', 'visible')
  const fetchInterval = setInterval(() => {
    // update fetching progress bar
    const currValue = parseInt($('#fetching-progress').val())
    $('#fetching-progress').val(currValue + 1)
  }, 1000)
  // get all events from relays
  const data = await getEvents(pubkey)
  // inform user fetching is done
  $('#fetching-status').html(txt.fetching + txt.check)
  clearInterval(fetchInterval)
  $('#fetching-progress').val(20)
  // inform user that backup file (json format) is being downloaded
  $('#file-download').html(txt.download)
  downloadFile(data)
  // inform user that app is broadcasting events to relays
  $('#broadcasting-status').html(txt.broadcasting)
  // show and update broadcasting progress bar
  $('#broadcasting-progress').css('visibility', 'visible')
  const broadcastInterval = setInterval(() => {
    // update fetching progress bar
    const currValue = parseInt($('#broadcasting-progress').val())
    $('#broadcasting-progress').val(currValue + 1)
  }, 1000)
  await broadcastEvents(data)
  // inform user that broadcasting is done
  $('#broadcasting-status').html(txt.broadcasting + txt.check)
  clearInterval(broadcastInterval)
  $('#broadcasting-progress').val(20)
  // re-enable broadcast button
  $('#broadcast').prop('disabled', false)
})

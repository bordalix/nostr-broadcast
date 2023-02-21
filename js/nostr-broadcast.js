// button click handler
const fetchAndBroadcast = async () => {
  // reset UI
  $('#fetching-status').html('')
  $('#fetching-progress').css('visibility', 'hidden')
  $('#fetching-progress').val(0)
  $('#events-found').text('')
  $('#broadcasting-status').html('')
  $('#broadcasting-progress').css('visibility', 'hidden')
  $('#broadcasting-progress').val(0)
  // messages to show to user
  const checkMark = '&#10003;'
  const txt = {
    broadcasting: 'Broadcasting to relays... ',
    fetching: 'Fetching from relays... ',
  }
  // parse pubkey ('npub' or hexa)
  const pubkey = parsePubkey($('#pubkey').val())
  if (!pubkey) return
  // disable button (will be re-enable at the end of the process)
  $('#fetch-and-broadcast').prop('disabled', true)
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
  const filter = { authors: [pubkey] }
  const data = await getEvents(filter)
  // inform user fetching is done
  $('#fetching-status').html(txt.fetching + checkMark)
  clearInterval(fetchInterval)
  $('#fetching-progress').val(20)
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
  $('#broadcasting-status').html(txt.broadcasting + checkMark)
  clearInterval(broadcastInterval)
  $('#broadcasting-progress').val(20)
  // re-enable broadcast button
  $('#fetch-and-broadcast').prop('disabled', false)
}

const getFromExtension = async () => {
  const pubkey = await window.nostr.getPublicKey()
  if (pubkey) $('#pubkey').val(pubkey).change()
}

const pubkeyOnChange = () => {
  $('#fetch-and-broadcast').css('display', '')
  $('#get-from-extension').css('display', 'none')
}

if (window.nostr) {
  $('#fetch-and-broadcast').css('display', 'none')
  $('#get-from-extension').css('display', '')
}

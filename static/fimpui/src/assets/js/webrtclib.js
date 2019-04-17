
class WebrtcLib {
  pc;

  generateOffer(){
    // this.pc = new RTCPeerConnection({
    //   iceServers: [
    //     {
    //       urls: 'stun:stun.l.google.com:19302'
    //     }
    //   ]
    // })
    //
    // let sendChannel = this.pc.createDataChannel('data')
    // sendChannel.onclose = () => console.log('sendChannel has closed')
    // sendChannel.onopen = () => console.log('sendChannel has opened')
    // sendChannel.onmessage = e => {
    //   console.log(`Message from DataChannel '${sendChannel.label}' payload '${e.data}'`)
    // }
    //
    // this.pc.oniceconnectionstatechange = e => console.log(this.pc.iceConnectionState)
    // this.pc.onicecandidate = event => {
    //   if (event.candidate === null) {
    //     document.getElementById('localSessionDescription').value = btoa(JSON.stringify(this.pc.localDescription))
    //   }
    // }
    // this.pc.onnegotiationneeded = e =>
    //   this.pc.createOffer().then(d => this.pc.setLocalDescription(d)).catch(console.log)

  }

  startWrtcSession() {
    // let sd = document.getElementById('remoteSessionDescription').value
    // if (sd === '') {
    //   return alert('Session Description must not be empty')
    // }
    //
    // try {
    //   this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(sd))))
    // } catch (e) {
    //   alert(e)
    // }
  }
}

function GetWebRtcInstance() {
  return new WebrtcLib()

}

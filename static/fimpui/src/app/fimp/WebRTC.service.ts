import {Injectable} from '@angular/core';
import {CacheService} from "./cache.service";
import {Subject} from "rxjs";
import {MqttMessage} from "angular2-mqtt";

// import { Observable,Subject } from 'rxjs/Rx';


declare const document: any;
declare const RTCPeerConnection: any;

@Injectable()
export class WebRTCService {

  pc ;
  sendChannel;
  public whatever$: Subject<{data: any}> = new Subject<{data: any}>();

  constructor() {

  }

  generateOffer() {
    this.pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    })

    this.sendChannel = this.pc.createDataChannel('data')
    this.sendChannel.onclose = () => console.log('sendChannel has closed')
    this.sendChannel.onopen = () => console.log('sendChannel has opened')
    this.sendChannel.onmessage = e => {
      console.log(`Message from DataChannel '${this.sendChannel.label}' payload '${e.data}'`)
      this.whatever$.next(this.convertWrtcMsgToMqttMsg(e.data))
    }

    this.pc.oniceconnectionstatechange = (e) => {
      console.log(this.pc.iceConnectionState)
      if (this.pc.iceConnectionState == "connected") {
        console.log("Connected to HUB via WebRtc");
      }
    }
    this.pc.onicecandidate = event => {
      if (event.candidate === null) {
        document.getElementById('localSessionDescription').value = btoa(JSON.stringify(this.pc.localDescription))

      }
    }
    this.pc.onnegotiationneeded = e =>
      this.pc.createOffer().then((d) => this.pc.setLocalDescription(d) ).catch(console.log)

  }

  convertWrtcMsgToMqttMsg(data:string):any {
    let parsedMsg = JSON.parse(data);
    let result = {"topic":parsedMsg.topic,"payload":JSON.stringify(parsedMsg.payload)}
    return result

  }


  startWrtcSessionFromForm() {
    let sd = document.getElementById('remoteSessionDescription').value;
    this.startWrtcSession(sd);
  }

  startWrtcSession(sd:string) {
    if (sd === '') {
      return alert('Session Description must not be empty')
    }

    try {
      this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(sd))))
    } catch (e) {
      alert(e)
    }
  }

  getLocalDescriptor():string {
    return  btoa(JSON.stringify(this.pc.localDescription))
  }

  publish(topic:string,payload:string) {
    let msg = {"topic":topic,"payload":payload};
    this.sendChannel.send(JSON.stringify(msg));
  }

}

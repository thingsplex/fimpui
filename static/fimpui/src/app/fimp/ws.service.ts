import {Observable, Subject} from 'rxjs';
import { FimpMessage, NewFimpMessageFromString } from "app/fimp/Message";
import {MQTT_PORT} from "../globals";

// @Injectable()
export class WsFimpService {
    private connState:string = "disconnected";
    private websocket: any;
    private msgObservable: Subject<FimpMessage> = new Subject<FimpMessage>();
    private connStateObservable: Subject<string> = new Subject<string>();

    constructor(){
      console.log("Fimp service constructor")
    }

    public publish(topic: string, message: string) {
      this.websocket.send(message);
    }

    public getMsgObservable():Observable<FimpMessage>{
      return this.msgObservable;
    }

    public getConnStateObservable():Observable<string> {
      return this.connStateObservable;
    }

    public getConnState():string {
      return this.connState;
    }

    public isConnected():boolean {
      if (this.connState == "connected")
        return true
      else
        return false
    }

    public connect(){
      this.connState = "connecting"
      this.websocket = new WebSocket("ws://localhost:8081/ws-bridge"); //dummy echo websocket service
      this.websocket.onopen =  (evt) => {
        console.log("Connected to WS-Bridge")
        this.connState = "connected"
        this.connStateObservable.next("connected")
      };
      this.websocket.onmessage = (evt) => {
        console.log("New WS msg from server:")
        console.dir(evt)
        let fimpMsg = NewFimpMessageFromString(evt.data)
        this.msgObservable.next(fimpMsg);
      };
      this.websocket.onclose = (e) => {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        this.connState = "reconnecting"
        this.connStateObservable.next("reconnecting")
        setTimeout(function() {
          this.connect();
        }, 1000);
      };

      this.websocket.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        this.connState = "disconnected"
        this.connStateObservable.next("disconnected")
        this.websocket.close();
      };

    }
}

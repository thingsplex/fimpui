import {Observable, Subject} from 'rxjs';
import { FimpMessage, NewFimpMessageFromString } from "app/fimp/Message";
import {MQTT_PORT} from "../globals";

// @Injectable()
export class WsFimpService {

    private websocket: any;
    private inboundMsgChannel: Subject<FimpMessage> = new Subject<FimpMessage>();

    constructor(){
      console.log("Fimp service constructor")
    }

    public publish(topic: string, message: string) {
      this.websocket.send(message);
    }

    public subscribe():Observable<FimpMessage>{
      return this.inboundMsgChannel
    }

    public connect(){
      this.websocket = new WebSocket("ws://localhost:8081/ws-bridge"); //dummy echo websocket service
      this.websocket.onopen =  (evt) => {
        // this.websocket.send("Hello World");
        console.log("Connected to WS-Bridge")
      };
      this.websocket.onmessage = (evt) => {
        console.log("New WS msg from server:")
        console.dir(evt)
        let fimpMsg = NewFimpMessageFromString(evt.data)
        this.inboundMsgChannel.next(fimpMsg);
      };
      this.websocket.onclose = function(e) {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', e.reason);
        setTimeout(function() {
          this.connect();
        }, 1000);
      };

      this.websocket.onerror = function(err) {
        console.error('Socket encountered error: ', err.message, 'Closing socket');
        this.websocket.close();
      };

    }
}

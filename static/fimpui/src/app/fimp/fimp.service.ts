import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
  IMqttMessage,
  MqttService
} from 'ngx-mqtt';
import {FimpMessage, NewFimpMessageFromString} from "app/fimp/Message";
import {ConfigsService} from 'app/configs.service';
import {WebRtcService} from "./web-rtc.service";
import {WsFimpService} from "app/fimp/ws.service";
import {tap} from "rxjs/operators";
import {MQTT_PORT} from "../globals";

export class FimpFilter {
  public topicFilter: string;
  public serviceFilter: string;
  public msgTypeFilter: string;
  public srcFilter: string;
}


@Injectable()
export class FimpService {
  get webRtcService(): WebRtcService {
    return this._webRtcService;
  }

  get transportType(): string {
    return this._transportType;
  }

  set transportType(value: string) {
    localStorage.setItem("fimpTransportType", value);
    this._transportType = value;
  }

  private messages: FimpMessage[] = [];
  private filteredMessages: FimpMessage[] = [];
  public observable: any = null;
  public wrtcObservable: Observable<IMqttMessage>;
  public maxLogSize: number = 200;
  private fimpFilter: FimpFilter;
  private isFilteringEnabled: boolean;
  private globalTopicPrefix: string;
  public mqttSeviceOptions: any;
  private _transportType: string;
  private brokerPort: number = 0;
  public mqttConnState = 0;
  public isMessageCaptureEnabled: boolean = true;
  private ws: WsFimpService = new WsFimpService();

  constructor(public mqtt: MqttService, private configs: ConfigsService, private _webRtcService: WebRtcService) {
    this.fimpFilter = new FimpFilter();
    this.isFilteringEnabled = false;
    // this.mqtt.state.subscribe(state => {
    //   console.log("mqtt connection state :" + state)
    //   this.mqttConnState = state;
    // })
    this._transportType = localStorage.getItem("fimpTransportType");
    if (!this._transportType) {
      this._transportType = "ws"
    }

    this._transportType = "ws"
    this.connect();
  }

  public init() {
    let topic = this.prepareTopic("pt:j1/#");
    this.subscribeToAll(topic);
  }

  public connect() {
    if(this._transportType == "mqtt") {
      let mqttHost: string = window.location.hostname;
      this.mqttSeviceOptions = {
        hostname: mqttHost,
        port: MQTT_PORT,
        path: '/mqtt',
        username: this.configs.configs.mqtt_server_username,
        password: this.configs.configs.mqtt_server_password
      };
      this.mqttSeviceOptions["globalTopicPrefix"] = this.configs.configs.mqtt_topic_global_prefix;
      this.globalTopicPrefix = this.configs.configs.mqtt_topic_global_prefix;
      this.mqtt.onConnect.subscribe((message: any) => {
        console.log("FimpService onConnect");
      });
      this.mqtt.connect(this.mqttSeviceOptions);
    }else if(this._transportType == "ws") {
      this.ws.connect();
    }
  }

  public isConnected(): boolean {
    // if (this.mqttConnState == 2) {
    //   return true
    // }
    // return false
    return this.ws.isConnected();
  }

  public getConnState():string {
    return this.ws.getConnState();
  }

  private prepareTopic(topic: string): string {
    if (this.globalTopicPrefix != "") {
      topic = this.globalTopicPrefix + "/" + topic;
    }
    return topic;
  }

  public enableMessageCapture(state: boolean) {
    this.isMessageCaptureEnabled = state;
  }

  public getMessageCaptureState() {
    return this.isMessageCaptureEnabled;
  }

  public detachGlobalPrefix(topic: string): string {
    if (this.globalTopicPrefix != "") {
      if (topic != undefined) {
        var ptPos = topic.indexOf("pt:")
        var resultTopic = topic.substring(ptPos);
        var prefix = topic.substr(0, ptPos);
        return resultTopic;
      } else {
        return topic;
      }

    } else {
      return topic;
    }
  }

  private subscribeToAll(topic: string): Observable<IMqttMessage> {
    console.log("Subscribing to all messages ")
    this.observable = this.subscribe(topic);
    this.observable.subscribe((msg) => {
      if (msg != null) {
        this.saveMessage(msg);
      }
    });
    return this.observable
  }

  public getGlobalObservable(): Observable<FimpMessage> {
    console.log("Getting global observable");
    if (this.observable == null) {
      this.subscribeToAll("pt:j1/#");
    }
    return this.observable;
  }

  public getConnStateObservable():Observable<string> {
    return this.ws.getConnStateObservable();
  }

  // public getMqttSignalingOservable(): Observable<IMqttMessage> {
  //   console.log("Getting global observable");
  //   if (this.observable == null) {
  //     this.subscribeToAll("pt:j1/#");
  //   }
  //   return this.observable;
  // }


  public setFilter(topic: string, service: string, msgType: string) {
    this.fimpFilter.topicFilter = topic;
    this.fimpFilter.serviceFilter = service;
    this.fimpFilter.msgTypeFilter = msgType;
    if (topic == "" && service == "" && msgType == "") {
      this.isFilteringEnabled = false;
    } else {
      this.isFilteringEnabled = true;
    }
    console.log(this.isFilteringEnabled)
    this.filteredMessages.length = 0;
    this.messages.forEach(element => {
      console.log("normal message")
      this.saveFilteredMessage(element);
    });
  }

  // public subscribe(topic: string):Observable<MqttMessage>{
  private subscribe(topic: string): Observable<FimpMessage> {
    if (this._transportType == "mqtt") {
      // var topic = this.prepareTopic(topic);
      // console.log("Subscribing to topic " + topic);
      // return this.mqtt.observe(topic);
    }if (this._transportType == "ws") {
      return this.ws.getMsgObservable();
    }else{
      console.log("subscribing to webrtc");
      // return this._webRtcService.inboundMsgChannel$.pipe(tap(d => console.log(d)));
    }
  }

  public subscribeMqtt(topic: string): any {
    var topic = this.prepareTopic(topic);
    console.log("Subscribing to topic " + topic);
    return this.mqtt.observe(topic);
  }


  public subscribeWebRtc(topic: string): any {
    return this._webRtcService.inboundMsgChannel$.pipe(tap(d => console.log(d)));
  }

  public publishMqtt(topic: string, message: string) {
    topic = this.prepareTopic(topic);
    console.log("Publishing to topic " + topic);
    this.mqtt.publish(topic, message, {qos: 1}).subscribe((err) => {
      console.log(err);
    });
  }

  public publish(topic: string, message: FimpMessage) {
    if (this._transportType == "mqtt") {
      this.publishMqtt(topic, message.toString())
    } else if (this._transportType == "ws") {
      message.topic = topic
      this.ws.publish(topic,message.toString())
    } else {
      this._webRtcService.publish(topic, message.toString())
    }

  }

  public discoverResources() {
    let msg = new FimpMessage("system", "cmd.discovery.request", "null", null, null, null)
    this.publish("pt:j1/mt:cmd/rt:discovery", msg);
  }

  private rotateMessages(msgLog: FimpMessage[]) {
    if (msgLog.length > this.maxLogSize) {
      msgLog.pop();
    }
  }

  private saveMessage(fimpMsg: FimpMessage) {
    if (!this.isMessageCaptureEnabled)
      return
    try {
      // console.log("Saving new message to log")
      fimpMsg.topic = this.detachGlobalPrefix(fimpMsg.topic);
      // fimpMsg.raw = fimpMsg.toString()
      fimpMsg.localTs = Date.now();
      fimpMsg.localId = this.messages.length + 1;
      this.messages.unshift(fimpMsg);
      this.rotateMessages(this.messages);
      this.saveFilteredMessage(fimpMsg);
      this.rotateMessages(this.filteredMessages);
    } catch (e) {
      console.log("Can't parse message")
    }

  }

  private saveFilteredMessage(fimpMsg: FimpMessage) {
    if (fimpMsg.mtype == "evt.camera.image") {
      fimpMsg.raw = "content deleted"
      fimpMsg.val = "content deleted"
    }
    if (this.isFilteringEnabled) {
      if (((this.fimpFilter.topicFilter == undefined || this.fimpFilter.topicFilter == "") || fimpMsg.topic.includes(this.fimpFilter.topicFilter)) &&
        ((this.fimpFilter.serviceFilter == undefined || this.fimpFilter.serviceFilter == "") || fimpMsg.service.includes(this.fimpFilter.serviceFilter)) &&
        ((this.fimpFilter.msgTypeFilter == undefined || this.fimpFilter.msgTypeFilter == "") || fimpMsg.mtype.includes(this.fimpFilter.msgTypeFilter))) {
        // this.filteredMessages.unshift(fimpMsg);
        this.filteredMessages.push(fimpMsg);
      }
    } else {
      // console.log("Adding message to filtered list")
      this.filteredMessages.push(fimpMsg);
    }

  }

  public getFilter(): FimpFilter {
    return this.fimpFilter;
  }

  public getMessagLog(): FimpMessage[] {
    return this.messages;
  }

  public getFilteredMessagLog(): FimpMessage[] {
    return this.filteredMessages;
  }


}


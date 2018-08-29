import { Injectable } from '@angular/core';
import { Observable,Subject } from 'rxjs/Rx';
import { Http, Response,URLSearchParams }  from '@angular/http';
import {
  MqttMessage,
  MqttModule,
  MqttService
} from 'angular2-mqtt';
import { FimpMessage, NewFimpMessageFromString } from "app/fimp/Message";
import { BACKEND_ROOT } from "app/globals";
import { ConfigsService } from 'app/configs.service';

export class FimpFilter {
  public topicFilter:string;
  public serviceFilter:string;
  public msgTypeFilter:string;
}


@Injectable()
export class FimpService{
  private messages:FimpMessage[]=[];
  private filteredMessages:FimpMessage[]=[];
  public observable: Observable<MqttMessage> = null;
  public maxLogSize:number = 100;
  private fimpFilter : FimpFilter;
  private isFilteringEnabled:boolean;
  private globalTopicPrefix:string;
  public mqttSeviceOptions:any;
  constructor(public mqtt: MqttService,private configs:ConfigsService) {
    this.fimpFilter = new FimpFilter();
    this.isFilteringEnabled = false; 
    this.mqtt.onConnect.subscribe((message: any) => {
          console.log("FimpService onConnect");
          // this.observable = null;
    }); 
    this.connect();
   
  }
  public init() {
    var topic =  this.prepareTopic("pt:j1/#");
    this.subscribeToAll(topic);
  }
  public connect(){
    let mqttHost : string = window.location.hostname;
    this.mqttSeviceOptions  = {
      hostname:mqttHost,
      port: 8081,
      path: '/mqtt',
      username:this.configs.configs.mqtt_server_username,
      password:this.configs.configs.mqtt_server_password
    };
    this.mqttSeviceOptions["globalTopicPrefix"] = this.configs.configs.mqtt_topic_global_prefix;
    this.globalTopicPrefix = this.configs.configs.mqtt_topic_global_prefix;
    this.mqtt.connect(this.mqttSeviceOptions);
  }
  private prepareTopic(topic:string):string {
    if (this.globalTopicPrefix != "") {
     topic = this.globalTopicPrefix+"/"+topic;
    }
    return topic;
  }
  public detachGlobalPrefix(topic:string):string{
    if (this.globalTopicPrefix!="") {
      if (topic != undefined) {
        var ptPos = topic.indexOf("pt:")
        var resultTopic = topic.substring(ptPos);
        var prefix = topic.substr(0,ptPos);
        console.log("Result topic = "+resultTopic);
        console.log("Result prefix = "+prefix);
        return resultTopic;
      }else {
        return topic;
      }
      
    }else {
      return topic;
    }
  }

  private subscribeToAll(topic: string):Observable<MqttMessage>{
    console.log("Subscribing to all messages ") 
    // topic = this.prepareTopic(topic);
    console.log("Subscribing to topic "+topic); 
    this.observable = this.mqtt.observe(topic);
    this.observable.subscribe((msg) => {
      var msgTopic = this.detachGlobalPrefix(msg.topic)
      console.log("New message from topic :"+msgTopic+" message :"+msg.payload)
      this.saveMessage(msg);
    });
    return this.observable
  }
  public getGlobalObservable():Observable<MqttMessage>{
    console.log("Getting global observable");
    if (this.observable == null){
      var topic =  this.prepareTopic("pt:j1/#");
      this.subscribeToAll(topic);
    }
    return this.observable;
  }
  public setFilter(topic:string,service:string,msgType:string) {
    this.fimpFilter.topicFilter = topic;
    this.fimpFilter.serviceFilter = service;
    this.fimpFilter.msgTypeFilter = msgType;
    if (topic == "" && service == "" && msgType == "" ){
      this.isFilteringEnabled = false;
    }else {
      this.isFilteringEnabled = true;
    }
    console.log(this.isFilteringEnabled)
    this.filteredMessages.length = 0;
    this.messages.forEach(element => {
      console.log("normal message")
      this.saveFilteredMessage(element);
    });
  }
    
  public subscribe(topic: string):Observable<MqttMessage>{
    var topic =  this.prepareTopic(topic);
    console.log("Subscribing to topic "+topic);
    return this.mqtt.observe(topic);
  }
  public publish(topic: string, message: string) {
    topic =  this.prepareTopic(topic);
    console.log("Publishing to topic "+topic);
    this.mqtt.publish(topic, message, {qos: 1}).subscribe((err)=>{
      console.log(err);
    });
  }
 private rotateMessages(msgLog:FimpMessage[]) {
    if(msgLog.length>this.maxLogSize) {
      msgLog.pop();
    }
 }

 private saveMessage(msg:MqttMessage){
      console.log("Saving new message to log")
      let fimpMsg  = NewFimpMessageFromString(msg.payload.toString());
      fimpMsg.topic = this.detachGlobalPrefix(msg.topic);
      fimpMsg.raw = msg.payload.toString();
      fimpMsg.localTs =  Date.now();
      fimpMsg.localId = this.messages.length+1;
      this.messages.unshift(fimpMsg);
      this.rotateMessages(this.messages);
      this.saveFilteredMessage(fimpMsg);
      this.rotateMessages(this.filteredMessages);
 }
 
 private saveFilteredMessage(fimpMsg : FimpMessage){
  if (this.isFilteringEnabled) {
    if ( ( (this.fimpFilter.topicFilter== undefined || this.fimpFilter.topicFilter == "") || this.fimpFilter.topicFilter == fimpMsg.topic) && 
        ( (this.fimpFilter.serviceFilter== undefined || this.fimpFilter.serviceFilter == "") || this.fimpFilter.serviceFilter == fimpMsg.service) &&
        ( (this.fimpFilter.msgTypeFilter== undefined || this.fimpFilter.msgTypeFilter == "") || this.fimpFilter.msgTypeFilter == fimpMsg.mtype)  ) {
      this.filteredMessages.unshift(fimpMsg);
    }
  }else {
    console.log("Adding message to filtered list")
    this.filteredMessages.unshift(fimpMsg);
  }    
  
}
public getFilter():FimpFilter {
  return this.fimpFilter;
}

public getMessagLog():FimpMessage[]{
   return this.messages;
 }
 public getFilteredMessagLog():FimpMessage[]{
  return this.filteredMessages;
}
}


@Injectable()
export class WsService {

    private actionUrl: string;
    private websocket: any;
    private receivedMsg: any;
    private observable:Observable<any>;
    
    constructor(){
      console.log("Fimp service constructor")
      this.connect();
      this.websocket = new WebSocket("ws://echo.websocket.org/"); //dummy echo websocket service
      this.websocket.onopen =  (evt) => {
          
          this.websocket.send("Hello World");
      };
    }

    public sendMessage(text:string){
      this.websocket.send(text);
    }

    public GetInstance(): Observable<any> {
      return this.observable
    }

    public connect(){
     this.observable = Observable.create(observer=>{
          this.websocket.onmessage = (evt) => { 
              observer.next(evt);
          };
      })
      .map(res=>"From WS: " + res.data)
      .share();
      // var subject = new Subject();
      // this.observable = source.multicast(subject);
      // this.observable.connect();
      
    }
}
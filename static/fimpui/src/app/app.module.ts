import { RouterModule, Routes } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import { GaugeModule } from 'angular-gauge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule, MatCheckbox } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CdkTableModule } from '@angular/cdk/table';
import {
  ZwaveManComponent,
  AddDeviceDialog,
  RemoveDeviceDialog,
  PingDeviceDialog,
  ConfirmDialogComponent
} from './zwave-man/zwave-man.component';
import { TemplateEditorDialog } from './zwave-man/template-editor.component';
import { ZigbeeManComponent ,AddZigbeeDeviceDialog} from './zigbee-man/zigbee-man.component';
import { GenericAdManComponent ,AddGenericDeviceDialog} from './tpui-modules/generic-ad-man/generic-ad-man.component';
import { SystemsManComponent } from './systems-man/systems-man.component';
import { TimelineComponent, MsgDetailsDialog } from './timeline/timeline.component';

import { ReportComponent } from './report/report.component';
import { FimpService } from './fimp/fimp.service';
import { FimpApiMetadataService } from './fimp/fimp-api-metadata.service';

import { ThingsDbService } from './things-db.service';
import { ConfigsService } from './configs.service';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import {
  IMqttMessage,
  MqttModule,
  MqttService
} from 'ngx-mqtt';
import { ThingViewComponent } from './thing-view/thing-view.component';
import { ThingsTableComponent } from './things-table/things-table.component';
import { SettingsComponent } from './settings/settings.component';
import { FlowModule} from './tpui-modules/flow/flow.module';
import { StatsModule} from './stats/stats.module';
import { RegistryModule} from './tpui-modules/registry/registry.module';
import { AnalyticsModule} from './tpui-modules/analytics/analytics.module';
import { SystemModule} from "./system/system.module";
import {environment} from "../environments/environment";
import {JsonInputComponent} from "./tpui-modules/flow/ui-elements/json-input.component";
// import {FireService} from "./firebase/fire.service";
import {WebRtcService} from 'app/fimp/web-rtc.service';
import {MatButtonToggleModule} from "@angular/material/button-toggle";
//
const appRoutes: Routes = [
  { path: 'settings', component: SettingsComponent },
  { path: 'zwave-man', component: ZwaveManComponent },
  { path: 'zigbee-man', component: ZigbeeManComponent },
  { path: 'generic-ad-man', component: GenericAdManComponent },
  { path: 'systems-man', component: SystemsManComponent },
  { path: 'timeline', component: TimelineComponent },
  { path: 'report', component: ReportComponent },
  { path: 'thing-view/:ad/:id', component: ThingViewComponent },
  { path: 'thing-view-addr/:id', component: ThingViewComponent },
  { path: '',redirectTo:'/analytics/dashboard',pathMatch: 'full'}
];
let mqttHost : string = window.location.hostname;
let mqttPort : number = Number(window.location.port);
if (localStorage.getItem("mqttHost")!= null){
      mqttHost = localStorage.getItem("mqttHost");
}else {
  localStorage.setItem("mqttHost",mqttHost);
}
if (localStorage.getItem("mqttPort")!= null){
      mqttPort = parseInt(localStorage.getItem("mqttPort"));
} else {
  localStorage.setItem("mqttPort",String(mqttPort));
}
console.log("Port:"+localStorage.getItem("mqttPort"));
export const MQTT_SERVICE_OPTIONS = {
  connectOnCreate: false
  // hostname:mqttHost,
  // port: mqttPort,
  // path: '/mqtt',
  // username:"5Qm19y",
  // password:"66ldpVL19cab"
};

export function mqttServiceFactory() {
  console.log("Starting mqttService");
  let mqs =  new MqttService(MQTT_SERVICE_OPTIONS);
  return mqs;
}

export function startupServiceFactory(startupService: ConfigsService): Function {
  return () => startupService.load();
}

@NgModule({
  declarations: [
    AppComponent,
    ZwaveManComponent,
    ZigbeeManComponent,
    GenericAdManComponent,
    SystemsManComponent,
    AddDeviceDialog,
    AddZigbeeDeviceDialog,
    AddGenericDeviceDialog,
    RemoveDeviceDialog,
    PingDeviceDialog,
    TimelineComponent,
    ThingViewComponent,
    ThingsTableComponent,
    SettingsComponent,
    ReportComponent,
    TemplateEditorDialog,
    MsgDetailsDialog,
    ConfirmDialogComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    // MaterialModule,
    MqttModule.forRoot(MQTT_SERVICE_OPTIONS),
    // AngularFireModule.initializeApp(environment.firebase),
    // AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    MatButtonModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatChipsModule,
    MatOptionModule,
    MatSelectModule,
    MatListModule,
    MatIconModule,
    MatSliderModule,
    MatCheckboxModule,
    MatDialogModule,
    MatCardModule,
    MatSidenavModule,
    MatRadioModule,
    MatMenuModule,
    MatExpansionModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatTabsModule,
    RouterModule.forRoot(appRoutes),
    NgxDatatableModule,
    FlowModule,
    StatsModule,
    AnalyticsModule,
    SystemModule,
    RegistryModule,
    CdkTableModule,
    GaugeModule.forRoot(),
    MatButtonToggleModule

  ],
  providers: [WebRtcService, FimpService,FimpApiMetadataService,ThingsDbService,ConfigsService,{ //FireService
    // Provider for APP_INITIALIZER
    provide: APP_INITIALIZER,
    useFactory: startupServiceFactory,
    deps: [ConfigsService],
    multi: true
}],
  entryComponents:[AddDeviceDialog,AddZigbeeDeviceDialog,AddGenericDeviceDialog,RemoveDeviceDialog,PingDeviceDialog,TemplateEditorDialog,MsgDetailsDialog,ConfirmDialogComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }

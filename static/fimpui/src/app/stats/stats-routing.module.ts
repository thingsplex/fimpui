import { RouterModule, Routes } from '@angular/router';
import { NgModule } from "@angular/core";
import {EventLogComponent} from './event-log/event-log.component';
import {SystemMetricsComponent} from './system-metrics/system-metrics.component';
import {SystemAlarmsComponent} from './system-alarms/system-alarms.component';
import {TsdbConfigComponent} from "./tsdb/tsdb-config.component";
import { ThingViewComponent } from "app/thing-view/thing-view.component";


@NgModule({
  imports: [RouterModule.forChild([
    { path: 'stats/event-log', component: EventLogComponent },
    { path: 'stats/system-metrics', component: SystemMetricsComponent },
    { path: 'stats/system-alarms', component: SystemAlarmsComponent },
    { path: 'stats/tsdb-config', component: TsdbConfigComponent },
    { path: 'fimp/thing-view-addr/:id', component: ThingViewComponent },
  ])],
  exports: [RouterModule]
})
export class StatsRoutingModule {}

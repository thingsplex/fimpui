import { RouterModule, Routes } from '@angular/router';
import { NgModule } from "@angular/core";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {Component} from "@angular/core/src/metadata/directives";
import {PresenceComponent} from "./presence/presence.component";


@NgModule({
  imports: [RouterModule.forChild([
    { path: 'analytics/dashboard', component: DashboardComponent },
    { path: 'analytics/presence', component: PresenceComponent },
  ])],
  exports: [RouterModule]
})
export class AnalyticsRoutingModule {}

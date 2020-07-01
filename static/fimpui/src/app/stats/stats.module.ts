import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { EventLogComponent,EventsPerDeviceChart } from './event-log/event-log.component';
import { SystemMetricsComponent } from './system-metrics/system-metrics.component';
import { AngrydogComponent } from './angrydog/angrydog.component';
import { StatsRoutingModule } from "./stats-routing.module";
// import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatPaginator } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    CdkTableModule,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatTableModule,
    MatListModule,
    MatIconModule,
    MatRadioModule,
    MatSliderModule,
    MatDialogModule,
    MatExpansionModule,
    MatTabsModule,
     // ChartsModule,
    StatsRoutingModule
  ],
  exports:[EventsPerDeviceChart],
  declarations: [EventLogComponent,SystemMetricsComponent,AngrydogComponent,EventsPerDeviceChart]
})
export class StatsModule { }

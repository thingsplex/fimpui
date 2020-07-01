import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { SystemRoutingModule } from "./system-routing.module";
import { last } from 'rxjs/operator/last';
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
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import {SystemDashboardComponent} from "./dashboard/systemDashboardComponent";
import {AppsManComponent} from "./apps/apps-man.component";
import {AppConfigComponent} from "./apps/app-config.component";
import {CpuChartComponent} from "./charts/cpu-chart.component";
import {AppsRegistryService} from "./apps/apps-registry.service";


@NgModule({
  imports: [
    CommonModule,
    SystemRoutingModule,
    FormsModule,
    CdkTableModule,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
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
  ],
  exports:[],
  providers:[AppsRegistryService],
  declarations: [SystemDashboardComponent,AppsManComponent,AppConfigComponent,AppsManComponent,CpuChartComponent]
})
export class SystemModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { ClientRoutingModule } from './client-routing.module';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientCreateComponent } from './client-create/client-create.component';

@NgModule({
   imports: [
      CommonModule,
      ClientRoutingModule,
      ReactiveFormsModule,
      HttpModule
   ],
   declarations: [ClientListComponent, ClientCreateComponent]
})
export class ClientModule { }
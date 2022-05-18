import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthPageComponent } from "../modules/auth/components/auth-page/auth-page.component";
import { LayoutComponent } from "../modules/main/components/layout/layout.component";
import { LoginComponent } from "../modules/auth/components/login/login.component";
import { SignUpComponent } from "../modules/auth/components/sign-up/sign-up.component";
import { VkLoggedInComponent } from "../modules/auth/components/vk-logged-in/vk-logged-in.component";


export const ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: LayoutComponent,
  },
  {
    path: 'logged-in',
    component: VkLoggedInComponent,
  },
  {
    path: 'auth',
    component: AuthPageComponent,
    children: [
      {
        path: '',
        component: LoginComponent,
        data: { name: 'auth' },
      },
      {
        path: 'sign-up',
        component: SignUpComponent,
        data: { name: 'signUp' },
      }
    ]
  }
];

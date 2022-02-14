import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { UpdatePasswordRequest, User, UserData, UserLogin, UserRegistration } from '../models/user';
import { UserApiService } from './user-api.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private user = new BehaviorSubject<User | null>(null);

  user$: Observable<User | null>;
  vkAuthLink = environment.vkAuthLink;

  constructor(
    private userApiService: UserApiService,
    private router: Router,
    private cookieService: CookieService,
  ) {
    this.user$ = this.loadUser().pipe(
      switchMap(user => {
        this.user.next(user);
        return this.user.asObservable();
      }),
      shareReplay({ refCount: false, bufferSize: 1 }),
    );
  }

  logout(): void {
    this.user.next(null);
    this.cookieService.deleteAll();
    this.router.navigateByUrl('/auth');
  }

  signUp(form: UserRegistration): Observable<void> {
    return this.userApiService.signUp(form).pipe(
      map(user => {
        this.user.next(user);
      }),
    );
  }

  login(form: UserLogin): Observable<void> {
    return this.userApiService.login(form).pipe(
      map(user => {
        this.user.next(user);
      }),
    );
  }

  loadUser(): Observable<User | null> {
    return this.userApiService.loadProfile().pipe(
      catchError(() => {
        return of(null);
      }),
    );
  }

  updateUser(user: UserData): Observable<void> {
    return this.userApiService.updateProfile(user).pipe(
      map(user => this.user.next(user)),
    );
  }

  updatePassword(form: UpdatePasswordRequest): Observable<void> {
    return this.userApiService.updatePassword(form);
  }

  private generateToken(username: string, password: string): string {
    return window.btoa(username + ':' + password);
  }
}
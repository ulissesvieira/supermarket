import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpSentEvent, HttpHeaderResponse } from '@angular/common/http';
import { HttpProgressEvent, HttpResponse, HttpUserEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/take';

import { AuthenticationService } from './authentication.service';

@Injectable()
export class RequestInterceptorService implements HttpInterceptor {
   private isRefreshingToken = false;
   tokenSubject: BehaviorSubject<string> = new BehaviorSubject<string>(null);

   constructor(private authenticationService: AuthenticationService) { }

   addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
      return req.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
   }

   intercept(req: HttpRequest<any>, next: HttpHandler):
      Observable<HttpSentEvent | HttpHeaderResponse | HttpProgressEvent | HttpResponse<any> | HttpUserEvent<any>> {
      return next.handle(this.addToken(req, this.authenticationService.getToken()))
         .catch(
         error => {
            if (error instanceof HttpErrorResponse) {
               switch ((<HttpErrorResponse>error).status) {
                  case 400:
                     this.handle400Error(error);
                     break;
                  case 401:
                     this.handle401Error(req, next);
                     break;
                  case 419:
                     this.handle419Error(req, next);
                     break;
               }
            } else {
               return Observable.throw(error);
            }
         }
         );
   }

   handle400Error(error) {
      if (error && error.status === 400 && error.error && error.error.error === 'invalid_grant') {
         // If we get a 400 and the error message is 'invalid_grant', the token is no longer valid so logout.
         return this.logoutUser();
      }

      return Observable.throw(error);
   }

   handle401Error(req: HttpRequest<any>, next: HttpHandler) {
      if (!this.isRefreshingToken) {
         this.handle419Error(req, next);
      } else {
         return this.tokenSubject
                     .filter(token => token != null)
                     .take(1)
                     .switchMap(token => {
                                    return next.handle(this.addToken(req, token));
                               });
      }
   }

   handle419Error(req: HttpRequest<any>, next: HttpHandler) {
      this.isRefreshingToken = true;
      // Reset here so that the following requests wait until the token
      // comes back from the refreshToken call.
      this.tokenSubject.next(null);

      return this.authenticationService.refreshToken()
         .switchMap((newToken: string) => {
            if (newToken) {
               this.tokenSubject.next(newToken);
               return next.handle(this.addToken(req, newToken));
            } else {
               // If we don't get a new token, we are in trouble so logout.
               this.logoutUser();
            }
         })
         .catch(error => {
            // If there is an exception calling 'refreshToken', bad news so logout.
            this.logoutUser();
            return Observable.throw(error.json().error || 'Refresh Token error');
         })
         .finally(() => {
            this.isRefreshingToken = false;
         });
   }

   logoutUser() {
      return this.authenticationService.logout();
   }
}

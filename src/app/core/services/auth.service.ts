import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import {Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {UserCredential} from '@firebase/auth-types';

import {User, UserRegistration} from 'src/app/shared/models/user.model';
import {auth} from 'firebase/app';
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly authState$: Observable<User>;
  readonly user$: Observable<User>;

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router
  ) {
    this.authState$ = this.afAuth.authState;
    this.user$ = this.afAuth.authState.pipe(
      switchMap((user: User) => {
        return user ? this.afs.doc<User>(`users/${user.uid}`).valueChanges() : of(null);
      })
    );
  }

  async googleSignIn(): Promise<any> {
    const provider = new auth.GoogleAuthProvider();
    const credential = await this.afAuth.signInWithPopup(provider);
    return this.updateUserData(credential.user);
  }

  get getUser(): Observable<User> {
    return this.user$;
  }

  get getAuthState(): Observable<User> {
    return this.authState$;
  }

  public login(email: string, password: string): Promise<UserCredential> {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  public logout(): Promise<void> {
    return this.afAuth.signOut();
  }

  public async register(userRegistration: UserRegistration): Promise<User | void> {
    const {displayName, email, firstName, fullName, lastName, password} = userRegistration;
    return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then(async (credentials) => {
        await credentials.user.updateProfile({displayName});
        const newUser: User = {
          displayName,
          email: credentials.user.email,
          firstName,
          fullName,
          lastName,
          photoURL: credentials.user.photoURL,
          uid: credentials.user.uid,
        };
        await this.afs.doc<User>(`users/${newUser.uid}`).set(newUser);
      });
  }

  private updateUserData(user: firebase.User): Promise<boolean | void> {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(`users/${user.uid}`);
    const data = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
    return userRef.set(data, {merge: true}).then(() => this.router.navigate(['/']));
  }
}

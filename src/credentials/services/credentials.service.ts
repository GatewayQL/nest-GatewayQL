import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { CreateCredentialInput } from '../dto/create-credential.input';
import { UpdateCredentialInput } from '../dto/update-credential.input';
import { CredentialEntity } from '../models/credential.entity';
import { Credential } from '../models/credential.interface';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { AppsService } from '../../apps/services/apps.service';
import { User } from '../../users/models/user.interface';
import { ConsumerType } from '../models/credential.interface';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,

    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,

    private userService: UsersService,

    @Inject(forwardRef(() => AppsService))
    private appsService: AppsService,
  ) {}

  create(createCredentialInput: CreateCredentialInput): Observable<Credential> {
    return this.checkUserExistence(createCredentialInput.consumerId).pipe(
      switchMap((res: boolean) => {
        if (res) {
          return this.checkCredentialExistence(
            createCredentialInput.consumerId,
          ).pipe(
            switchMap((exist: boolean) => {
              if (!exist) {
                return this.authService
                  .saltAndHash(createCredentialInput.secret)
                  .pipe(
                    switchMap((secretHash: string) => {
                      if (secretHash && typeof secretHash != 'undefined') {
                        const newCredential = new CredentialEntity();
                        newCredential.consumerId =
                          createCredentialInput.consumerId;
                        newCredential.scope = createCredentialInput.scope;
                        newCredential.isActive = true;
                        newCredential.type = createCredentialInput.type;
                        if (createCredentialInput.type === 'key-auth') {
                          newCredential.keyId = uuidv4();
                          newCredential.keySecret = secretHash;
                        } else if (
                          createCredentialInput.type === 'basic-auth'
                        ) {
                          newCredential.password = createCredentialInput.secret;
                          newCredential.passwordHash = secretHash;
                        } else if (createCredentialInput.type == 'oauth2') {
                          newCredential.secret = secretHash;
                        }
                        return from(
                          this.credentialRepository.save(newCredential),
                        ).pipe(
                          map((credential: Credential) => {
                            const { secret, keySecret, password, ...result } =
                              credential;
                            return result;
                          }),
                          catchError((err) => throwError(err)),
                        );
                      } else {
                        throwError('Cannot create secretHash.');
                      }
                    }),
                  );
              } else {
                throwError(
                  'Credential: ' +
                    createCredentialInput.consumerId +
                    ' already exists and is active.',
                );
              }
            }),
          );
        } else {
          throwError(
            'User : ' + createCredentialInput.consumerId + ' does not exists.',
          );
        }
      }),
    );
  }

  findAll(): Observable<Credential[]> {
    return from(this.credentialRepository.find()).pipe(
      map((credentials: Credential[]) => {
        credentials.forEach(function (v) {
          delete v.password;
          delete v.keySecret;
          delete v.secret;
        });
        return credentials;
      }),
    );
  }

  findOne(id: string): Observable<Credential> {
    return from(this.credentialRepository.findOneBy({ id })).pipe(
      map((credential: Credential) => {
        delete credential.password;
        delete credential.keySecret;
        delete credential.secret;
        return credential;
      }),
    );
  }

  findByCosumerId(consumerId: string) {
    return this.credentialRepository.findOneBy({ consumerId });
  }

  update(
    id: string,
    updateCredentialInput: UpdateCredentialInput,
  ): Observable<Credential> {
    return from(this.credentialRepository.findOne({ where: { id } })).pipe(
      switchMap((credential: Credential) => {
        if (!credential) {
          return throwError(
            () => new Error(`Credential with id ${id} not found`),
          );
        }

        // Update allowed fields
        if (updateCredentialInput.scope !== undefined) {
          credential.scope = updateCredentialInput.scope;
        }

        if (updateCredentialInput.isActive !== undefined) {
          credential.isActive = updateCredentialInput.isActive;
        }

        // If updating secret, hash it
        if (updateCredentialInput.secret) {
          return this.authService
            .saltAndHash(updateCredentialInput.secret)
            .pipe(
              switchMap((secretHash: string) => {
                if (credential.type === 'key-auth') {
                  credential.keySecret = secretHash;
                } else if (credential.type === 'basic-auth') {
                  credential.password = updateCredentialInput.secret;
                  credential.passwordHash = secretHash;
                } else if (credential.type === 'oauth2') {
                  credential.secret = secretHash;
                }

                credential.updatedBy =
                  updateCredentialInput.updatedBy || 'system';

                return from(this.credentialRepository.save(credential)).pipe(
                  map((updated: Credential) => {
                    delete updated.secret;
                    delete updated.keySecret;
                    delete updated.password;
                    return updated;
                  }),
                );
              }),
            );
        }

        credential.updatedBy = updateCredentialInput.updatedBy || 'system';

        return from(this.credentialRepository.save(credential)).pipe(
          map((updated: Credential) => {
            delete updated.secret;
            delete updated.keySecret;
            delete updated.password;
            return updated;
          }),
        );
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  remove(id: string): Observable<Credential> {
    return from(this.credentialRepository.findOne({ where: { id } })).pipe(
      switchMap((credential: Credential) => {
        if (!credential) {
          return throwError(
            () => new Error(`Credential with id ${id} not found`),
          );
        }

        // Soft delete by setting isActive to false
        credential.isActive = false;
        credential.updatedBy = 'system';

        return from(this.credentialRepository.save(credential)).pipe(
          map((updated: Credential) => {
            delete updated.secret;
            delete updated.keySecret;
            delete updated.password;
            return updated;
          }),
        );
      }),
      catchError((err) => throwError(() => err)),
    );
  }

  private checkUserExistence(username: string): Observable<boolean> {
    return from(
      this.userService.findByUsername(username).then((user: User) => {
        if (user && user.username === username) {
          return true;
        } else {
          return false;
        }
      }),
    );
  }

  private checkCredentialExistence(consumerId: string): Observable<boolean> {
    return from(
      this.findByCosumerId(consumerId).then((credential: Credential) => {
        if (credential && credential.isActive) {
          return true;
        } else {
          return false;
        }
      }),
    );
  }
}
